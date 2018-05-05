/**
 * AccountSubscription.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || sails.config.env.STRIPE_SECRET_KEY) //secret key
import {ALLOWED_EMAILS, ACCOUNT_SUBSCRIPTION_STATUSES} from '../constants'
console.log(ACCOUNT_SUBSCRIPTION_STATUSES);
module.exports = {
  tableName: "accountSubscriptions",
  attributes: {
    status:            {type: "string", enum: ACCOUNT_SUBSCRIPTION_STATUSES, defaultsTo: ACCOUNT_SUBSCRIPTION_STATUSES[0], required: true},  //SHOULD ALWAYS BE ACTIVE, EVERY USER NEEDS ONE OF THESE . Let stripe keep track of when they cancelled etc. We'll just keep track of their current status. HOwever, when we add workgroups, maybe just leave this alone, and user logs into workgroup to post for the group. But maybe will also want company subscription to apply for a single user. In that case, maybe check both subscriptions? or just ignore the user's one or somethign?
    subscriptionFor:   {type: "string", enum: ["USER", "WORKGROUP"], defaultsTo: "USER"},
    subscriptionStatus:   {type: "string"}, //using stripe's statuses
    stripeCustomerId:  {type: "string"},
    stripeSubscriptionId:  {type: "string"},
    paymentPlan:       {type: "string"}, //stripe's subscription plan ID for their plan
    currency:          {type: "string"}, //not sure if we'll use it, but international so maybe?
    defaultSourceId:     {type: "string"}, //their credit card's source id in stripe's db
    defaultSourceLastFour:    {type: "string"}, //their credit card's last 4
    currentPeriodEnd:  {type: "datetime"},// basically when next payment is due
    currentPeriodStart:{type: "datetime"},// basically when last Payment was made
    cancelAtPeriodEnd:  {type: "boolean"},//whether or not they are set to renew or are not paying anymore at date of nextPaymentDue
    cancelledAt:        {type: "datetime"},
    endedAt:            {type: "datetime"},
    planItemId:         {type: "string"}, //used for updating stripe plan OR reactivating account
    websiteQuantity:    { type: 'integer' },

    //associations
    //only one userId , as the owner of the subscription
    userId: {
      model: 'users',
      required: true,
    },
    //But eventually, might allow this to be part of a group
    workgroupId: { //might not use this very much, since owner is also member, so can just populate memberships
      model: 'users',
    },
    //in that scenario, only a group admin could edit this subscription

  },
  autoCreatedAt: true,
  autoUpdatedAt: true,

  //every user should have this called on them, so they're ready for stripe
  initializeForStripe: (user) => {
    return new Promise((resolve, reject) => {
      stripe.customers.create({
        email: user.email, //this is optional; won't use for creating customer for group
      }, (err, customer) => {
        if (err) {
          return reject(err)
        }

        const params = AccountSubscriptions._translateFromStripe(customer, "customer")
        params.userId = user.id
        params.subscriptionFor = "USER"

        params.paymentPlan = ALLOWED_EMAILS.includes(user.email) ? "free" : "standard-monthly"

        AccountSubscriptions.create(params)
        .then((accountSub) => {
          //should return the updated accountSubscriptions record
          return resolve(accountSub)
        })
        .catch((err) => {
          return reject(err)
        })
      })
    })
  },

  //1) attach create card to customer in stripe; 2) make default card
  handleCreditCardUpdate: (accountSubscription, data, user) => {
    return new Promise((resolve, reject) => {
      const {source} = data //source is source obj created in client  (ie, payment source's) id.

      if (!source || !source.id) {return reject(new Error("no source id provided in ", data))}

      //attach card to customer
      stripe.customers.createSource(accountSubscription.stripeCustomerId, {source: source.id}, (err, source) => {
        if (err) {
          sails.log.debug("ERROR creating stripe customer: ");
          return reject(err)
        }

        //will update our records with these params
        let params = AccountSubscriptions._translateFromStripe(source, "source")
        if (source.currency) {params.currency = source.currency}

        //make default card
        stripe.customers.update(accountSubscription.stripeCustomerId, {default_source: source.id}, (err2, customer) => {
          if (err2) {
            sails.log.debug("ERROR making this default payment for stripe customer: ");
            return reject(err2)
          }
          params = Object.assign({}, params, AccountSubscriptions._translateFromStripe(customer, "customer"))

          //update account record
          return AccountSubscriptions.update({id: accountSubscription.id}, params)
          .then(([updatedAccountSubscription]) => {
            console.log(updatedAccountSubscription);

          //setting source on a subscription, updating or creating, sets it as default card for customer, skipping previous two steps
          //this was no longer working, so just doing long way again
          //const params = {source}

            const params = {}

            const doIt = () => {
              if (!accountSubscription.stripeSubscriptionId) {
                //create the stripe subscription
                return AccountSubscriptions.createStripeSubscription(accountSubscription, user, params)
              } else {
                return AccountSubscriptions.updateStripeSubscription(accountSubscription, user, params)
              }
            }
            doIt()
            .then((readyAccountSub) => {
              //sub is now ready to be billed

              return resolve(readyAccountSub)
            })
            .catch((err3) => {
              return reject(err3)
            })
          })
        })
      })
    })
  },

  //use subscription, in case workgroup admin who is not userId wants to change this eventually
  //get the subscription in the controller
  //NOTE cannot create paid subscription without credit card on file
  //params arg should be ready to be passed directly to stripe
  createStripeSubscription: (accountSubscription, user, params = {}) => {
    return new Promise((resolve, reject) => {
      //now setting source before getting here
      //if (!params || !params.source) {throw new Error("source is required before creating stripe subscription (should be object)")}

      //payment plan will often be set separately from creating subscription, or even before credit card info is set. So, first derived from the record
      // currently manually overriding requests for free plan that shouldn't be, for security reasons.
      accountSubscription.paymentPlan = ALLOWED_EMAILS.includes(user.email) ? "free" : accountSubscription.paymentPlan || "basic-monthly"

      let stripeParams = AccountSubscriptions._translateForStripe(accountSubscription, "subscription")
      Object.assign(stripeParams, params)
      stripeParams.billing = "charge_automatically"

      stripe.subscriptions.create(stripeParams, (err, stripeSubscription) => {
        if (err) {
          sails.log.debug("ERROR creating stripe subscription: ", err);
          return reject(err)
        }

        return resolve(AccountSubscriptions._syncAPIWithStripeSub(stripeSubscription, accountSubscription))
      })
    })
  },

  //change their subscription plan, then match our record to theirs
  //params arg should be ready to be passed directly to stripe
  updateStripeSubscription: (accountSubscription, params = {}, user) => {
    return new Promise(async (resolve, reject) => {
      // currently manually overriding requests for free plan that shouldn't be, for security reasons.
      accountSubscription.paymentPlan = ALLOWED_EMAILS.includes(user.email) ? "free" : accountSubscription.paymentPlan || "basic-monthly"

      //in case we've updated our record and now need to update stripe, eg, if user has changed payment plan or added coupon, but we haven't updated stripe yet (MUST DO, SINCE EXTERNAL API!!!)
      let stripeParams = AccountSubscriptions._translateForStripe(params, "subscription")
      //don't want to update customer (don't know if we ever will)
      delete stripeParams.customer

      // if prepaid, just update our record (hopefully can stop doing this soon...). Don't have a stripe subscription to update....
      if (ALLOWED_EMAILS.includes(user.email)) {
        return AccountSubscriptions.update({id: accountSubscription.id}, params)
        .then(([accountSubscription]) => {
          return resolve(accountSubscription)
        })
        .catch((err) => {
          return reject(err)
        })
      }


      // can't update an item and quantity at same time. So just do one at a time
      try {
        //so far only (pretending to) update  items and quantity. But to do others, expand the arrays. I know items and quantity can't go together, but maybe others can?

        let latestStripeSub
        for (let stripeKeySet of [["items"], ["quantity", "coupon", "default_ource"]]) {
          let hasUpdatesForSet = Object.keys(stripeParams).some(key => stripeKeySet.includes(key))
          if (hasUpdatesForSet) {
            latestStripeSub = await AccountSubscriptions._updateStripe({
              accountSubscription,
              stripeParams: _.pick(stripeParams, stripeKeySet)
            })
          }
        }

        // latestStripeSub will only be defined if at least one stripeKeySet had updates to run
        return latestStripeSub ? resolve(AccountSubscriptions._syncAPIWithStripeSub(latestStripeSub, accountSubscription)) : "nothing was updated"
      } catch (err) {
        return reject(err)
      }
    })
  },

  // just takes stripe params, updates stripe, and returns stripe record
  _updateStripe: ({accountSubscription, stripeParams}) => {
    return new Promise((resolve, reject) => {

console.log("stripe id:", accountSubscription.stripeSubscriptionId);
console.log("stripe params for this update:", stripeParams);

      stripe.subscriptions.update(accountSubscription.stripeSubscriptionId,
        stripeParams
      , (err, stripeSubscription) => {
        if (err) {
          sails.log.debug("ERROR updating stripe subscription: ", );
          return reject(err)
        }

        return resolve(stripeSubscription)
      })
    })
  },

  //refresh/sync data with stripe - particularly subscription
  //for checking the card's status, see checkCreditCardStatus
  //TODO will have to make usable for workgroups in future too maybe
  checkStripeStatus: (userId) => {
    return new Promise((resolve, reject) => {
      let accountSubscription

      AccountSubscriptions.findOne({userId: userId, status: "ACTIVE"})
      .then((accountSub) => {
        accountSubscription = accountSub
        //if (!accountSubscription || !accountSubscription.stripeSubscriptionId) {
        if (!accountSubscription || !accountSubscription.stripeCustomerId) {
          //there is no subscription in stripe yet, just return
          return resolve(accountSubscription)
        }


        /* this retrieved one sub, but if admin (jason) changed in dashboard or created a new one, it wouldn't get it
        * instead get all for a given stripe customer, which stays consistent with the user
        *
        stripe.subscriptions.retrieve(accountSubscription.stripeSubscriptionId,
        (err, stripeSubscription) => {
          if (err) {
            sails.log.debug("ERROR retrieving stripe subscription: ", err);
            return reject(err)
          }
          //returns in sync account record
          return resolve(AccountSubscriptions._syncAPIWithStripeSub(stripeSubscription, accountSubscription))
        })
        */
        stripe.subscriptions.list({
          customer: accountSubscription.stripeCustomerId
        }, (err, result) => {
          if (err) {
            sails.log.debug("ERROR retrieving stripe subscription: ", err);
            return reject(err)
          }

          const subscriptions = result.data || []
          //if more than one subscription, if any active, use that one
          //need to send an alert to us too though TODO, we don't want them billed for one if they have a free one active too!
          const activeSubscriptions = subscriptions.filter((sub) => sub.status === "active") //not doing trialing yet
          //if more than one active, use the cheapest one
          let subToUse
          if (activeSubscriptions.length > 0) {
            //not doing anything yet, just getting first one. Maybe later get the cheapest one
            subToUse = activeSubscriptions[0]
          } else {
            subToUse = subscriptions[0]
          }

          //returns in sync account record
          return resolve(AccountSubscriptions._syncAPIWithStripeSub(subToUse, accountSubscription, {noSubsForCustomer: !subToUse}))
        })
      })
      .catch((err) => {
        return reject(err)
      })
    })
  },

  checkCreditCard: (accountSubscription) => {
    return new Promise((resolve, reject) => {
      const sourceId = accountSubscription.defaultSourceId

      stripe.sources.retrieve(sourceId, (err, source) => {
        return resolve(source) //looking especially for source.status === "chargeable"


      })
    })
  },

  //either canceling at end of next billing period or immediately
  cancelStripeSubscription: (accountSubscription, data) => {
    return new Promise((resolve, reject) => {
      const params = {
        at_period_end: data && !data.cancelImmediately,
      }

      stripe.subscriptions.del(accountSubscription.stripeSubscriptionId, params, (err, cancelledStripeSubscription) => {
        if (err) {
          sails.log.debug("ERROR cancelling stripe subscription: ", );
          return reject(err)
        }
        console.log("now syncing cancelled stripe record with our record");
        console.log(cancelledStripeSubscription);
        //returns in sync account record
        return resolve(AccountSubscriptions._syncAPIWithStripeSub(cancelledStripeSubscription, accountSubscription))
      });
    })
    .catch((err) => {
      sails.log.debug("Error cancelling stripe for : ", req.user.email);
      return res.badRequest(err)
    })
  },

  // if account is active but cancelling at period end, stop cancelling at period end.
  // if account is ended, take source from old stripe sub, and create a new one (only way stripe lets it work), archive user's current record, and create new one for the user
  reactivateStripeSubscription: (user) => {
    return new Promise((resolve, reject) => {
      let accountSubscription
      AccountSubscriptions.checkStripeStatus(user.id)
      .then((result) => {
        accountSubscription = result
        //only need to check; not update it. Will already be attached to the cutomser in stripe, so is ready to go. Sources never get attached to subscriptions in stripe
        return AccountSubscriptions.checkCreditCard(accountSubscription)
      })
      .then((source) => {
        if (source.status !== "chargeable") {
          throw {code: "requires-new-card"}
        }

        if (accountSubscription.endedAt || !accountSubscription.stripeSubscriptionId) {
          //create a new one; archive old one for record keeping
          let newAccountSub
          return AccountSubscriptions.update({id: accountSubscription.id}, {status: "ARCHIVED"})
          .then((archivedSub) => {
            const params = _.pick(archivedSub, ["stripeCustomerId", "currency", "defaultSourceId", "paymentPlan", "currentPeriodEnd"])

            return AccountSubscriptions.create(params)
          })
          .then((result) => {
            newAccountSub =  result

            return resolve(AccountSubscriptions.createStripeSubscription(newAccountSub, user))
          })
          .catch((err) => {
            sails.log.debug("Error reactivating stripe for : ", req.user.email);
            throw err
          })

        } else {
          //if you update and set the payment plan again, automatically reactiavtes plan if it hasn't cancelled yet

          const updateIt = (itemId) => {
            return AccountSubscriptions.updateStripeSubscription(accountSubscription, user, {items: [{id: itemId, plan: accountSubscription.paymentPlan}]})
          }

          let itemId

          //if don't have it yet, go and get it
          if (!accountSubscription.planItemId) {
            stripe.subscriptions.retrieve(accountSubscription.stripeSubscriptionId, (err, stripeSubscription) => {
              if (err) {
                return reject(err)
              }
              itemId = stripeSubscription.items.data[0].id

              return resolve(updateIt(itemId))
            })

          } else {
            itemId = accountSubscription.planItemId
            return resolve(updateIt(itemId))
          }
        }
      })
    })
  },

  listAllInvoices: (customer, limit = 10) => {
    //other search params available
    stripe.invoices.list({limit, customer}, (err, invoices) => {
      if (err) {
        sails.log.debug("ERROR getting stripe invoices: ", err);
      }
      console.log("INVOICES: ", invoices);
    })

  },

  // mostly used in background jobs. Checks multiple users' statuses, if paid or needs payment.
  // takes array of user records (ie same format as Users.find())
  checkMultipleAccountStatuses: (users) => {
    return new Promise((resolve, reject) => {
      //copies regular posting flow
      let unpaidUsers = []
      const promises = users.map((user) => {
        return new Promise((resolve2, reject2) => {
          AccountSubscriptions.checkStripeStatus(user.id)
          .then((sub) => {
            if (!ALLOWED_EMAILS.includes(user.email) && (!sub || ["past_due", "canceled", "unpaid", null].includes(sub.subscriptionStatus))) {
              unpaidUsers.push({
                user: user,
                error: {message: "Payment is required before user can publish", code: "delinquent-payment"},
              })

              return resolve2({userId: user.id, status: "rejected"} )
            } else {
              return resolve2({userId: user.id, status: "accepted"})
            }
          })
          .catch((err) => {
            sails.log.error("Error checking stripe while posting delayed post for ", user.email);
            sails.log.error(err);

            return resolve2({userId: user.id, status: "rejected"} )
          })
        })
      })

      return Promise.all(promises)
      .then((results) => {
        results = results || []
        const approvedUserIds = results.filter((r) => r.status === "accepted").map(r => r.userId)
        return resolve({approvedUserIds, unpaidUsers})
      })
      .catch((err) => {
        console.error("error checking acct status for multiple users", err);
        return reject(err)
      })
    })
  },


  //when receive stripe subscription from their api, this func handles it
  _syncAPIWithStripeSub: (stripeSubscription, accountSubscription, options = {}) => {
    return new Promise((resolve, reject) => {

      const params = AccountSubscriptions._translateFromStripe(stripeSubscription, "subscription", options)

      if (
        accountSubscription.paymentPlan &&
        (stripeSubscription && stripeSubscription.plan && stripeSubscription.plan.id) !== accountSubscription.paymentPlan
      ) {
        // maybe raise an error later, but for now, just make sure we see it
        sails.log.debug("ERROR: User's plan in stripe doesn't match our record for some reason!!! Did they hack us? Could just be we changed something manually too :)", accountSubscription.paymentPlan, stripeSubscription && stripeSubscription.plan );
      }

      return AccountSubscriptions.update({
        id: accountSubscription.id,
      }, params)
      .then(([accountSubscription]) => {
        //TODO probably send them an email if it's out of date, etc
        return resolve(accountSubscription)
      })
      .catch((err) => {
        return reject(err)
      })
    })
  },

  //does not necessarily create stripe sub though, if no payment info yet. But prepares the customer and creates our db record
  findOrInitializeSubscription: (user) => {
    //keep in mind, might not ever do anything other than "ACTIVE". Let stripe keep track of when they cancelled etc. We'll just keep track of their current status
    return AccountSubscriptions.findOne({userId: user.id, status: "ACTIVE"})
    .then((sub) => {
      if (!sub) {
        return AccountSubscriptions.initializeForStripe(user)
      } else {
        // just return it!
        return sub
      }
    })
    .catch((err) => {
      throw err
    })
  },

  //default to empty obj, don't want this erroring out
  _translateFromStripe: (data, stripeResourceType, options = {}) => {
    let params
    if (
      !options.noSubsForCustomer &&
      (!data || typeof data !== "object")
    ) throw new Error("data received from stripe is not an object:" , data)

    if (stripeResourceType === "customer") {
      const customer = data
      params = {
        stripeCustomerId: customer.id,
        currency: customer.currency,
        defaultSourceId: customer.default_source,
      }

    } else if (stripeResourceType === "subscription") {
      const stripeSubscription = data

      if (options.noSubsForCustomer) {
        params = {
          currentPeriodEnd: null,// basically when next payment is due
          currentPeriodStart: null,
          cancelAtPeriodEnd: null,
          cancelledAt: null,
          endedAt: null,
          subscriptionStatus: null,
          paymentPlan: null, //often these should already be kthe same. But if not, stripe's records are the source of truth
          stripeSubscriptionId: null,
          planItemId: null,
          websiteQuantity: null,
        }

      } else {
        params = {
          currentPeriodEnd: stripeSubscription.current_period_end && moment.unix(stripeSubscription.current_period_end).format() || null,// basically when next payment is due
          currentPeriodStart: stripeSubscription.current_period_start && moment.unix(stripeSubscription.current_period_start).format() || null,// basically when last Payment was made
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          cancelledAt: null,
          endedAt: stripeSubscription.ended_at && moment.unix(stripeSubscription.ended_at).format() || null,
          subscriptionStatus: stripeSubscription.status,
          paymentPlan: stripeSubscription.plan && stripeSubscription.plan.id || null, //often these should already be kthe same. But if not, stripe's records are the source of truth
          stripeSubscriptionId: stripeSubscription.id,
          planItemId: Helpers.safeDataPath(stripeSubscription, "items.data.0.id"),
          websiteQuantity: stripeSubscription.quantity,
        }
      }

    // assumes source is credit card
    } else if (stripeResourceType === "source") {
      const source = data
      params = {
        currency: source.currency,
        defaultSourceId: source.id,
        defaultSourceLastFour: source.card && source.card.last4,
      }
    }

    return params
  },

  //default to empty obj, don't want this erroring out
  //if don't want to pass in whole accountSub, just pick the traits you want...or better, don't use this helper
  _translateForStripe: (accountSubscription, stripeResourceType) => {
    //each pair should be path to param in the accountSubscription, then path to param in the obj to send to Stripe
    let stripeParams = {}, potentialParams

    if (!accountSubscription || typeof accountSubscription !== "object") throw new Error("accountSubscription to send is not an object" , accountSubscription)

    if (stripeResourceType === "customer") {
      potentialParams = [
        ["currency", "currency"],
        ["defaultSourceId", "default_source"],
      ]

    } else if (stripeResourceType === "subscription") {
      potentialParams = [
        ["couponCode", "coupon"], //update coupon (haven't tried yet) TODO
        ["paymentPlan", `items.0.plan`], //paymentPlan should be string with planId. only doing this if creating NOT IF UPDATING
        ["planItemId", `items.0.id`], //needs to be there for updating ppayment plan to work.
        ["stripeCustomerId", "customer"], //esp imp for creating nwe stripe sub (haven't tried yet) TODO
        ["websiteQuantity", "quantity"], // sets number to buy. Currently we only have websites as the quantity, so this works
      ]
    }

    //all this so don't send a whole bunch of undefined params to stripe, if there's things we are not tryihg to update, they are left untouched. But, if things set to false or null, we can update that.
    for (let paramPair of potentialParams) {
      let recordKey = paramPair[0]
      let stripeEquivalentKey = paramPair[1]
      let recordValue = Helpers.safeDataPath(accountSubscription, recordKey, undefined)
      //don't send anything that's undefined or null, but do send 0 or empty strings
      if (![undefined, null].includes(recordValue)) {
        console.log(recordKey, stripeEquivalentKey);
        _.set(stripeParams, stripeEquivalentKey, recordValue)
        console.log("now params are:", stripeParams);
      }
    }

    return stripeParams
  },
};

