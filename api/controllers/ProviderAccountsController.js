/**
 * ProviderController
 *
 * @description :: Server-side logic for managing providers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const blueprints = require('../blueprints');
module.exports = {
  find: (req, res) => {
    return blueprints.find(req, res);
  },

  //hack because query language not working right
  getUserAccounts:  (req, res) => {
    const userId = req.param("userId")
    if (!userId) {return res.forbidden()}

    ProviderAccounts.find({userId: userId}).populate("channels")
    .then((accounts) => {
      return res.ok(accounts)
    })
    .catch((err) => {
      console.log("Error finding user accounts");
      return res.negotiate(err)
    })

  },

  refreshChannelType: (req, res) => {
    const accountId = req.params.accountId;

    const channelType = req.body.channelType;

    ProviderAccounts.findOne(accountId)//.populate('channels')
    .then((account) => {
      if (account.userId !== req.user.id) {
        return res.forbidden()
      } else if (!account) {
        return res.badRequest()
      }

      return ProviderAccounts.refreshChannelType(account, channelType)
    })
    .then((result) => {
      return res.ok(result)
    })
    .catch((err) => {
      console.log("failure refreshing channel type");
      return res.negotiate(err)
    })
  },

  //might move eventually, but here for now
  getAllAnalyticsAccounts: (req, res) => {
    Analytics.getAllAccounts(req.user)
    .then((results) => {
      return res.ok(results)
    })
    .catch((err) => {
      console.error("Error getting all GA accounts for user", req.user.id, err);
      return res.negotiate(err)
    })
  },

  getAnalytics: (req, res) => {
    Analytics.getAnalytics(req.user, req.allParams())
    .then((results) => {
      return res.ok(results)
    })
    .catch((err) => {
      //Google returns err.errors
      console.error("Error getting Analytics for user", req.user.id);
      return res.negotiate(err.errors || err)
    })
  },

  auditContent: (req, res) => {
    Analytics.auditContent(req.user, req.allParams())
    .then((results) => {
      console.log("results", results)
      return res.ok(results)
    })
    .catch((err) => {
      //Google returns err.errors
      console.error("Error auditing content for user", req.user.id);
      return res.negotiate(err.errors || err)
    })
  },
};

