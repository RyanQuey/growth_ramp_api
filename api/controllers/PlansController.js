/**
 * PlanController
 *
 * @description :: Server-side logic for managing plans
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  createFromCampaign: (req, res) => {
    const planParams = req.body
    const campaign = req.body.associatedCampaign
    delete planParams.associatedCampaign

    Plans.createFromCampaign(campaign, planParams)
    .then((planWithTemplates) => {
      return res.created(planWithTemplates)
    })
    .catch((err) => {
      console.log("failure to create from campaign:");
      console.log(err);
      return res.badRequest(err)
    })
  },
};

