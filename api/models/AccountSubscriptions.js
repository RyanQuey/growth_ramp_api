/**
 * AccountSubscription.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || sails.config.env.STRIPE_SECRET_KEY) //secret key
import {ALLOWED_EMAILS, ACCOUNT_SUBSCRIPTION_STATUSES} from '../constants'

module.exports = {
  tableName: "accountSubscriptions",
  attributes: {
    //status:            {type: "string", enum: ACCOUNT_SUBSCRIPTION_STATUSES, defaultsTo: ACCOUNT_SUBSCRIPTION_STATUSES[0]},  //SHOULD ALWAYS BE ACTIVE, EVERY USER NEEDS ONE OF THESE . HOwever, when we add workgroups, maybe just leave this alone, and user logs into workgroup to post for the group. But maybe will also want company subscription to apply for a single user. In that case, maybe check both subscriptions? or just ignore the user's one or somethign?
    subscriptionFor:   {type: "string", enum: ["USER", "WORKGROUP"], defaultsTo: "USER"},
    stripeCustomerId:  {type: "string"},
    stripeSubscriptionId:  {type: "string"},
    paymentPlan:       {type: "string"}, //stripe's subscription plan ID for their plan
    currency:          {type: "string"}, //not sure if we'll use it, but international so maybe?
    defaultSourceId:     {type: "string"}, //their credit card's source id in stripe's db
    defaultSourceLastFour:     {type: "string"}, //their credit card's last 4
    currentPeriodEnd:  {type: "datetime"},// basically when next payment is due
    currentPeriodStart:{type: "datetime"},// basically when last Payment was made
    cancelAtPeriodEnd:  {type: "boolean"},//whether or not they are set to renew or are not paying anymore at date of nextPaymentDue
    cancelledAt:        {type: "datetime"},
    endedAt:            {type: "datetime"},

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

        params.paymentPlan = ALLOWED_EMAILS.includes(user.email) ? "free" : "basic-monthly"

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
      /*stripe.customers.createSource(accountSubscription.stripeCustomerId, {source: source.id}, (err, source) => {
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

*/

          //setting source on a subscription, updating or creating, sets it as default card for customer, skipping previous two steps
          const doIt = () => {
            if (!accountSubscription.stripeSubscriptionId) {
              //create the stripe subscription
              return AccountSubscriptions.createStripeSubscription(accountSubscription, user, source)
            } else {
              return AccountSubscriptions.updateStripeSubscription(accountSubscription, user, source)
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
 //       })
//      })
    })
  },

  //use subscription, in case workgroup admin who is not userId wants to change this eventually
  //get the subscription in the controller
  //NOTE cannot create paid subscription without credit card on file
  createStripeSubscription: (accountSubscription, user, source) => {
    return new Promise((resolve, reject) => {

      let stripeParams = AccountSubscriptions._translateForStripe(accountSubscription, "subscription")
      stripeParams.billing = "charge_automatically"
      stripeParams.source = source

      //payment plan will often be set separately from creating subscription, or even before credit card info is set. So, first derived from the record
      // currently manually overriding requests for free plan that shouldn't be, for security reasons.
      stripeParams.paymentPlan = ALLOWED_EMAILS.includes(user.email) ? "free" : stripeParams.paymentPlan || "basic-monthly"


      stripe.subscriptions.create(stripeParams, (err, stripeSubscription) => {
        if (err) {
          sails.log.debug("ERROR creating stripe customer: ", err);
          return reject(err)
        }

        return resolve(AccountSubscriptions._syncAPIWithStripeSub(stripeSubscription, accountSubscription))
      })
    })
  },

  //haven't tested yet
  //change their subscription plan
  updateStripeSubscription: (accountSubscription, user, params) => {
    return new Promise((resolve, reject) => {
      let stripeParams = AccountSubscriptions._translateForStripe(accountSubscription, "subscription")
      stripeParams.source = source

      //validation to make sure no one sneaks in a request for a free account
      stripeParams.paymentPlan = ALLOWED_EMAILS.includes(user.email) ? "free" : stripeParams.paymentPlan

      stripe.subscriptions.update(accountSubscription.stripeSubscriptionId, {
        stripeParams
      }, (err, stripeSubscription) => {
        if (err) {
          sails.log.debug("ERROR creating stripe customer: ", err);
          return reject(err)
        }

        return resolve(AccountSubscriptions._syncAPIWithStripeSub(stripeSubscription, accountSubscription))
      })
    })

  },

  //refresh data with stripe
  //TODO will have to make usable for workgroups in future too maybe
  checkStripeStatus: (userId) => {
    return new Promise((resolve, reject) => {
      let accountSubscription

      AccountSubscriptions.findOne({userId: userId})
      .then((accountSub) => {
console.log(accountSub);
        accountSubscription = accountSub
        if (!accountSubscription.stripeSubscriptionId) {
          //there is no subscription in stripe yet
          return resolve(null)
        }

        stripe.subscriptions.retrieve(accountSubscription.stripeSubscriptionId,
        (err, stripeSubscription) => {
          if (err) {
            sails.log.debug("ERROR retrieving stripe subscription: ", err);
            return reject(err)
          }
console.log("now syncing with our record");
          //returns in sync account record
          return resolve(AccountSubscriptions._syncAPIWithStripeSub(stripeSubscription, accountSubscription))
        })
      })
      .catch((err) => {
        return reject(err)
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

  //when receive stripe subscription, this func handles it
  _syncAPIWithStripeSub: (stripeSubscription, accountSubscription) => {
    return new Promise((resolve, reject) => {

      const params = AccountSubscriptions._translateFromStripe(stripeSubscription, "subscription")

      if (accountSubscription.paymentPlan && (stripeSubscription.plan && stripeSubscription.plan.id) !== accountSubscription.paymentPlan) {
        // maybe raise an error later, but for now, just make sure we see it
        sails.log.debug("ERROR: User's plan in stripe doesn't match our record for some reason!!! Did they hack us?", accountSubscription.paymentPlan, stripeSubscription.plan );
      }

      console.log("now updating to our db record");
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

  //default to empty obj, don't want this erroring out
  _translateFromStripe: (data, stripeResourceType) => {
    console.log("result from stripe:", data);
    let params
    if (!data || typeof data !== "object") throw new Error("data received from stripe is not an object" , data)

    if (stripeResourceType === "customer") {
      const customer = data
      params = {
        stripeCustomerId: customer.id,
        currency: customer.currency,
        defaultSourceId: customer.default_source,
      }

    } else if (stripeResourceType === "subscription") {
      const stripeSubscription = data
      params = {
        currentPeriodEnd: stripeSubscription.current_period_end && moment.unix(stripeSubscription.current_period_end).format() || null,// basically when next payment is due
        currentPeriodStart: stripeSubscription.current_period_start && moment.unix(stripeSubscription.current_period_start).format() || null,// basically when last Payment was made
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        cancelledAt: stripeSubscription.canceled_at && moment.unix(stripeSubscription.canceled_at).format() || null,
        endedAt: stripeSubscription.ended_at && moment.unix(stripeSubscription.ended_at).format() || null,
        subscriptionStatus: stripeSubscription.status,
        paymentPlan: stripeSubscription.plan && stripeSubscription.plan.id || null, //often these should already be kthe same. But if not, stripe's records are the source of truth
        stripeSubscriptionId: stripeSubscription.id,
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
  //data will be in form matching the accountSubscription record obj
  _translateForStripe: (data, stripeResourceType) => {
    //each pair should be path to param in the data, then path to param in the obj to send to Stripe
    let stripeParams = {}, potentialParams

    if (!data || typeof data !== "object") throw new Error("data to send is not an object" , data)

    if (stripeResourceType === "customer") {
      potentialParams = [
        ["currency", "currency"],
        ["defaultSourceId", "default_source"],
      ]

    } else if (stripeResourceType === "subscription") {
      potentialParams = [
        ["couponCode", "coupon"],
        ["paymentPlan", `items.0.plan`], //should be string with planId
        ["stripeCustomerId", "customer"],
      ]
    }

    //all this so don't send a whole bunch of undefined params to stripe, if there's things we are not tryihg to update, they are left untouched. But, if things set to false or null, we can update that.
    for (let paramPair of potentialParams) {
      if (Helpers.safeDataPath(data, paramPair[0], undefined) !== undefined) {
        _.set(stripeParams, paramPair[1])
      }
    }

    return stripeParams
  }
};

