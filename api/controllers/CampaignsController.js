/**
 * CampaignController
 *
 * @description :: Server-side logic for managing posts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  update: (req, res) => {
console.log("now updating");
    new Promise((resolve, reject) => {
      const params = req.body

      //if updating planId
      if (params.planId) {
        return resolve(Campaigns.matchToPlan(params))
      } else {
console.log("regular update")
        if (!params.id) {reject("No campaign with that ID found, and don't want to update every record accidentally...")}
        return resolve(Campaigns.update(params.id, params))
      }
    })
    .then((result) => {
      console.log("finished updating");
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
      res.ok(results)
    })
    .catch((err) => {res.badRequest(err)})
  },
};

