/**
 * CampaignController
 *
 * @description :: Server-side logic for managing posts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  publish: (req, res) => {
    const campaign = req.matchingRecord
    Campaigns.publish(campaign)
    .then((results) => {
      res.ok(results)
    })
    .catch((err) => {res.badRequest(err)})
  },
};

