/**
 * PlanController
 *
 * @description :: Server-side logic for managing plans
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const blueprints = require('../blueprints');
module.exports = {
  find: (req, res) => {
    return blueprints.find(req, res);
  },
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
      sails.log.error("failure to return populated plan:");
      sails.log.error(err);
      return res.badRequest(err)
    })
  },
  //doesn't update campaign at all; same plan Id
  //posts might get a new postTemplateId though
  updateFromCampaign: (req, res) => {
    const plan = req.matchingRecord
    const campaignId = req.body.associatedCampaign.id
    delete req.body.associatedCampaign
    Campaigns.findOne({id: campaignId, userId: req.user.id}).populate("posts")
    .then((campaign) => {
      return Plans.updateFromCampaign(campaign, plan)
    })
    .then((planWithTemplatesAndPosts) => {
      return res.ok(planWithTemplatesAndPosts)
    })
    .catch((err) => {
      sails.log.error("Failure to update from campaign:");
      sails.log.error(err);
      return res.badRequest(err)
    })
  },

  //NOTE does not set posts to have a given postTemplateId...though it should
  createFromCampaign: (req, res) => {
    const planParams = req.body
    const campaignId = req.body.associatedCampaign.id
    delete planParams.associatedCampaign

    Campaigns.findOne({id: campaignId, userId: req.user.id}).populate("posts")
    .then((campaign) => {
      return Plans.createFromCampaign(campaign, planParams)
    })
    .then((planWithTemplatesCampaignAndPosts) => {
      return res.created(planWithTemplatesCampaignAndPosts)
    })
    .catch((err) => {
      sails.log.error("failure to create from campaign:");
      sails.log.error(err);
      return res.badRequest(err)
    })
  },
};

