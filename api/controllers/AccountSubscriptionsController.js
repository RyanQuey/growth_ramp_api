/**
 * AccountSubscriptionsController
 *
 * @description :: Server-side logic for managing Accountsubscriptions
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  //first step of setting up user payments
	initializeForStripe: (req, res) => {
    //first, make sure user doesn't already have a customer related to them
    return AccountSubscriptions.findOne({userId: req.user.id})
    .then((sub) => {
      if (sub) {
        sails.log.debug("user already has subscription")
        //assuming that everything was initialized correctly, and just a bad request
        return res.ok(sub)
      }

      //then, create
      return AccountSubscriptions.initializeForStripe(req.user)
    })
    .then((accountSubscription) => {
      return res.created(accountSubscription)
    })
    .catch((err) => {
      sails.log.debug("ERROR creating stripe customer and subscription: ", err);
      return res.negotiate(err)
    })
  },

	updatePaymentInfo: (req, res) => {
    //first, make sure user doesn't already have a customer related to them
    return AccountSubscriptions.findOne({userId: req.user.id})
    .then((sub) => {
      if (!sub) {
        return AccountSubscriptions.initializeForStripe(req.user)
      } else {
        // just return it!
        return sub
      }
    })
    .then((accountSubscription) => {
      return res.created(accountSubscription)
    })
    .catch((err) => {
      sails.log.debug("ERROR creating stripe customer and subscription: ", err);
      return res.negotiate(err)
    })
  },

  //handle and payment CC info, whether creating or updating customer, and whether updating or creating subscription
  handleCreditCardUpdate: (req, res) => {
    return AccountSubscriptions.findOne({userId: req.user.id})
    .then((sub) => {
      if (!sub) {
        return AccountSubscriptions.initializeForStripe(req.user)
      } else {
        // just return it!
        return sub
      }
    })
    .then((accountSubscription) => {
      return AccountSubscriptions.updateStripeCustomer(accountSubscription, req.body)
    })
    .then((updatedSub) => {
      if (!updatedSub) {
        throw new Error("for some reason didn't find account subscription")
      }

      if (!updatedSub.stripeSubscriptionId) {
        //create the stripe subscription
        return AccountSubscriptions.createStripeSubscription(accountSubscription, req.body.paymentPlan, req.user)
      } else {

      }
      return res.ok(updatedSub)
    })
    .catch((err) => {
      return res.negotiate(err)
    })
  },

};

