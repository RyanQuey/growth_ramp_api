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

  //change their credit card etc
  updateStripeCustomer: (accountSubscription, data) => {
    return new Promise((resolve, reject) => {
      const {sourceId} = data //source should be token or source's  (ie, payment source's) id

      //set params, defaulting to what currently is
      const params = {
        default_source: sourceId || accountSubscription.defaultSourceId, //only ever really need to have one, so just set the source to default_source
      }

      stripe.customers.update(accountSubscription.stripeCustomerId, params, (err, customer) => {
        if (err) {
          sails.log.debug("ERROR creating stripe customer: ", err);
          return reject(err)
        }

        const params = AccountSubscriptions._translateFromStripe(customer, "customer")
        AccountSubscriptions.update({id: accountSubscription.id}, params)
        .then(([accountSub]) => {
          return resolve(accountSub)
        })
        .catch((err2) => {
          return reject(err2)
        })
      })
    })
  },

  //use subscription, in case workgroup admin who is not userId wants to change this eventually
  //get the subscription in the controller
  //NOTE cannot create paid subscription without credit card on file
  createStripeSubscription: (accountSubscription, user) => {
    return new Promise((resolve, reject) => {
      //validation to make sure no one sneaks in a request for a free account
      let paymentPlan = accountSubscription.paymentPlan || "basic-monthly"

      // currently manually overriding requests for free plan that shouldn't be, for security reasons.
      paymentPlan = ALLOWED_EMAILS.includes(user.email) ? "free" : paymentPlan

      stripe.subscriptions.create({
        customer: accountSubscription.stripeCustomerId,
        items: [{plan: paymentPlan}], //paymentPlan should be the plan's stripe id.
        billing: "charge_automatically",
      }, (err, stripeSubscription) => {
        if (err) {
          sails.log.debug("ERROR creating stripe customer: ", err);
          throw err
        }
        return resolve(AccountSubscriptions._syncAPIWithStripeSub(stripeSubscription))
      })
    })
  },

  //haven't tested yet
  //change their subscription plan
  updateStripeSubscription: (accountSubscription, newPaymentPlan, user) => {

  },

  //refresh data with stripe
  //TODO will have to make usable for workgroups in future too maybe
  checkStatus: (userId) => {
    return new Promise((resolve, reject) => {
      let accountSubscription

      AccountSubscriptions.findOne({userId: userId})
      .then((accountSub) => {
        accountSubscription = accountSub

        stripe.subscriptions.retrieve(accountSubscription.stripeCustomerId,
        (err, stripeSubscription) => {
          if (err) {
            sails.log.debug("ERROR creating stripe subscription: ", err);
            return reject2(err)
          }
          return resolve(AccountSubscriptions._syncAPIWithStripeSub(stripeSubscription))
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
  _syncAPIWithStripeSub: (stripeSubscription) => {
    return new Promise((resolve, reject) => {
      if (stripeSubscription.plan !== accountSubscription.paymentPlan) {
        // maybe raise an error later, but for now, just make sure we see it
        sails.log.debug("ERROR: User's plan in stripe doesn't match our record for some reason!!! Did they hack us?");
      }
      const params = AccountSubscriptions._translateFromStripe(customer, "subscription")
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
        currentPeriodEnd: moment.unix(stripeSubscription.current_period_end).format(),// basically when next payment is due
        currentPeriodStart: moment.unix(stripeSubscription.current_period_start).format(),// basically when last Payment was made
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        cancelledAt: moment.unix(stripeSubscription.canceled_at).format(),
        endedAt: moment.unix(stripeSubscription.ended_at).format(),
        subscriptionStatus: stripeSubscription.status,
      }
    }

    return params
  }
};

