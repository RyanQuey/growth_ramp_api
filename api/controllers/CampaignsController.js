/**
 * CampaignController
 *
 * @description :: Server-side logic for managing posts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

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

    Campaigns.publishCampaign(campaign)
    .then((results) => {
      //should be campaign (with posts attached to it)
      res.ok(results)
    })
    .catch((err) => {res.badRequest(err)})
  },
};

