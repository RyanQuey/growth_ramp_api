/**
 * AnalyticsController
 *
 * @description :: Server-side logic for managing providers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const blueprints = require('../blueprints');
module.exports = {
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

  getGAGoals: (req, res) => {
    const params = req.allParams()
    ProviderAccounts.findOne({
      userId: req.user.id,
      id: params.providerAccountId,
    })
    .then((account) => {
      // they're picking by profile, which is specific to a web property, so only showing goals for tht web propertY
      return GoogleAnalytics.getGoals(account, {websiteId: params.websiteId})//, profileId: filters.profileId, webPropertyId: filters.websiteId})
    })
    .then((goalData) => {
      return res.ok(goalData)
    })
    .catch((err) => {
      console.error("error getting goals for user", req.user.id);
      return res.negotiate(err)
    })
  },

  auditContent: (req, res) => {
    Analytics.auditContent(req.user, req.allParams())
    .then((results) => {
      return res.ok(results)
    })
    .catch((err) => {
      //Google returns err.errors
      console.error("Error auditing content for user", req.user.id);
      return res.negotiate(err.errors || err)
    })
  },
};

