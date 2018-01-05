/**
 * CampaignController
 *
 * @description :: Server-side logic for managing posts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const {ALLOWED_EMAILS} = require('../constants')
module.exports = {
  update: (req, res) => {
    new Promise((resolve, reject) => {
      const params = req.body

      //if updating planId
      if (params.planId) {
        return resolve(Campaigns.matchToPlan(params))

      } else {
        if (!req.param('id')) {reject("No campaign with that ID found, and don't want to update every record accidentally...")}

        return resolve(Campaigns.update(req.param('id'), params))
      }
    })
    .then((result) => {
      return res.ok(result)
    })
    .catch((err) => {
      console.log("failed to update campaign");
      console.log(err);
      return res.negotiate(err)
    })
  },

  publish: (req, res) => {
    const campaign = req.matchingRecord

    AccountSubscriptions.checkStripeStatus(req.user.id)
    .then((sub) => {
      if (!ALLOWED_EMAILS.includes(req.user.email) && (!sub || ["past_due", "canceled", "unpaid"].includes(sub.subscriptionStatus))) {
        throw {message: "Payment is required before user can publish", code: "delinquent-payment"}
      }

      return Campaigns.publishCampaign(campaign)
    })
    .then((results) => {
      //should be campaign (with posts attached to it, each with analytics to attach to them)
      res.ok(results)
    })
    .catch((err) => {res.badRequest(err)})
  },

	getAnalytics: (req, res) => {
    const campaign = Object.assign({}, req.matchingRecord)
    return Campaigns.getAnalytics(campaign)
    .then((result) => {
      //array of posts, mapped with an analytics property
      campaign.posts = result
      return res.ok(campaign)
    })
    .catch((err) => {
      console.log(err);
      console.log("Failed to get analytics for ", campaign.name);
      return res.negotiate(err)
    })
  },
};

