/**
 * PlanController
 *
 * @description :: Server-side logic for managing plans
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  fetchPopulatedPlan: (req, res) => {
    Plans.findOne(req.params.id)
    .populate("campaigns", {
      where: {
        status: {"!": "ARCHIVED"}
      }
    })
    .populate("postTemplates", {
      where: {
        status: {"!": "ARCHIVED"}
      }
    })
    .then((result) => {
      return res.ok(result)
    })
    .catch((err) => {
      console.log("failure to return populated plan:");
      console.log(err);
      return res.badRequest(err)
    })
  },
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

