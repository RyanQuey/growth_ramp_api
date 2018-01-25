/**
 * AccountSubscriptionsController
 *
 * @description :: Server-side logic for managing Accountsubscriptions
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const blueprints = require('../blueprints');
module.exports = {

  find: (req, res) => {
    return blueprints.find(req, res);
  },
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
      sails.log.debug("ERROR creating stripe customer and subscription: ");
      sails.log.debug(err);
      return res.negotiate(err)
    })
  },

  //check's stripe subscription and payment status, refreshes our record
  checkStripeStatus: (req, res) => {
    return AccountSubscriptions.checkStripeStatus(req.user.id)
    .then((result) => {
      return res.ok(result)
    })
    .catch((err) => {
      sails.log.debug("Error checking stripe status for : ", req.user.email);
      sails.log.debug(err);
      return res.badRequest(err)
    })
  },

  //either canceling at end of next billing period or immediately
  cancelStripeSubscription: (req, res) => {
    return AccountSubscriptions.findOrInitializeSubscription(req.user)
    .then((accountSubscription) => {
      return AccountSubscriptions.cancelStripeSubscription(accountSubscription, req.body)
    })
    .then((result) => {
      return res.ok(result)
    })
    .catch((err) => {
      sails.log.debug("Error cancelling stripe status for : ", req.user.email);
      sails.log.debug(err);
      return res.badRequest(err)
    })
  },

  //reactivates a once active account subscription
  reactivateStripeSubscription: (req, res) => {
    return AccountSubscriptions.reactivateStripeSubscription(req.user)
    .then((result) => {
      return res.ok(result)
    })
    .catch((err) => {
      sails.log.debug("Error reactivating stripe status for : ", req.user.email);
      sails.log.debug(err);
      return res.badRequest(err)
    })
  },

  //coupons, payment plan etc
  //keeps our record in sync with stripe
	updateSubscription: (req, res) => {
    return AccountSubscriptions.findOrInitializeSubscription(req.user)
    .then((accountSubscription) => {
      return AccountSubscriptions.updateSubscription(accountSubscription, req.body, req.user)
    })
    .then((accountSubscription) => {
      return res.created(accountSubscription)
    })
    .catch((err) => {
      sails.log.debug("ERROR creating stripe customer and subscription: ");
      sails.log.debug(err);
      return res.negotiate(err)
    })
  },

  //handle and payment CC info, whether creating or updating customer, and whether updating or creating subscription
  //use this rather than other paths of updating stripe subscription to make sure it goes well (b/c handling source obj)
  handleCreditCardUpdate: (req, res) => {
console.log("saw update");
    return AccountSubscriptions.findOrInitializeSubscription(req.user)
    .then((accountSubscription) => {
      const sourceObj = req.body
      return AccountSubscriptions.handleCreditCardUpdate(accountSubscription, sourceObj, req.user)
    })
    .then((updatedSubRecord) => {

      return res.ok(updatedSubRecord)
    })
    .catch((err) => {
      sails.log.debug(err);
      return res.negotiate(err)
    })
  },

};

