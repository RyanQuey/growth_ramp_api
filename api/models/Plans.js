/**
 * Plan.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
import { PLAN_STATUSES, TEMPLATE_PROPERTIES } from "../constants"

module.exports = {

  attributes: {
    name: { type: 'string', required: true }, //"e.g., my favorite plan"
    status: { type: 'string', required: true, enum: PLAN_STATUSES, defaultsTo: PLAN_STATUSES[0]  },
    // posts does put the channel info on first level, so can query there. No reason to make the data readily accessible/normalized here in plans, where a plan can change constantly, and data can just be retrieved from the posts

    //currently not using, but migration has already been ran
    //not sure of use case
    //channelConfigurations: { type: 'json', defaultsTo: {} }, //is just if each provider and each account for the provider is disabled or not for this plan (for UI)

    //Associations
    userId: {
      model: 'users',
      required: true,
    }, //will be the userid, until it is populated (.populate('user'))
    postTemplates: {
      collection: 'postTemplates',
      via: 'planId',
    },

    /*providerAccounts: {//(necessary to toggle entire providerAccounts without messing up channel configurations...edit: actually, not really, channelConfigurations is json, so can put settings there)
      collection: 'providerAccounts',
      via: 'plans',
      dominant: true
    },*/

    campaigns: {
      collection: 'campaigns',
      via: 'planId'
    },
    posts: {
      collection: 'posts',
      via: 'planId',
    },
    //not currently using...might not ever use
    permissions: {
      collection: 'permissions',
      via: 'planId'
    },
  },
  autoCreatedAt: true,
  autoUpdatedAt: true,

  createFromCampaign: (campaign, planParams) => {
    return new Promise((resolve, reject) => {
      let newPlan
      let lastParams

      //NOTE: didn't like passing in array of postTemplateParams as an attribute of the planParams for some reason
      //this should be fine though
      Plans.create(planParams)
      .then((result) => {
        newPlan = result
        console.log("newly created plan", newPlan);

        const promises = []

        for (let post of campaign.posts) {
          promises.push(PostTemplates.createFromPost(post, newPlan))
        }
        promises.push(Campaigns.update(campaign.id, {planId: newPlan.id}))

        return Promise.all(promises)
      })
      .then((results) => {
        let updatedCampaign = results.pop()[0]
        const templates = results.map((r) => r.newTemplate)
        const updatedPosts = results.map((r) => r.updatedPost)

        newPlan.postTemplates = templates

        return resolve({newPlan, updatedCampaign, updatedPosts})
      })
      .catch((err) => {
        sails.log.error("failing Params:", lastParams);
        return reject(err)
      })
    })
  },

  _matchTemplateToPost: (template, post) => {
    return new Promise((resolve, reject) => {
      //hopefully saves some db calls
      if (
        template.status === "ACTIVE" &&
        _.isEqual(
          _.pick(post, TEMPLATE_PROPERTIES),
          _.pick(template, TEMPLATE_PROPERTIES),
        )
      ) {

        //don't do anything, but return what update would
        return resolve(template)

      } else {
        const params = _.pick(post, TEMPLATE_PROPERTIES)

        return PostTemplates.update({id: template.id}, params)
        .then((result) => {
          const updatedTemplate = result[0]
          return resolve(updatedTemplate)
        })
        .catch((err) => {
          sails.log.error("ERROR updating template: ", err);
        })
      }
    })
  },

  updateFromCampaign: (campaign, plan) => {
    return new Promise((resolve, reject) => {
      //find any posts from campaign that have a postTemplateId, and just update those (if anything) rather than archiving and recreating, enabing continuity between the postTemplate
      const posts = campaign.posts
      const postsWithTemplate = posts.filter((p) => p.postTemplateId)
      const postsWithoutTemplate = posts.filter((p) => !p.postTemplateId)

      const promises = []
      let currentPostTemplates

      PostTemplates.find({planId: plan.id})
      .then((results) => {
        currentPostTemplates = results

        for (let post of postsWithTemplate) {
          console.log(typeof results, typeof post.postTemplateId);
          let templateIndex = currentPostTemplates.findIndex((template) => template.id == post.postTemplateId)
          //retrieves and removes from list
          let associatedTemplate = currentPostTemplates.splice(templateIndex, 1)[0]
          promises.push(Plans._matchTemplateToPost(associatedTemplate, post))
        }

        for (let post of postsWithoutTemplate) {
          promises.push(PostTemplates.createFromPost(post, plan))
        }

        //any current templates still in list have since been deleted from campaign
        const idsToArchive = currentPostTemplates.map((t) => t.id)
        promises.push(PostTemplates.update({id: idsToArchive}, {status: "ARCHIVED"}))

        return Promise.all(promises)
      })
      .then((results) => {
        const templates = [], updatedPosts = []
        for (let result of results) {
          if (result.newTemplate && result.updatedPost) {
            //just created the template
            templates.push(result.newTemplate)
            updatedPosts.push(result.updatedPosts)
          } else if (result.status !== "ARCHIVED") {
            //just updated the template
            updatedPosts.push(result)
          }
        }
        plan.postTemplates = templates
        return resolve({plan, updatedPosts})
      })
      .catch((err) => {
        sails.log.error("ERROR updating plan to match campaign: ", err);
      })
    })
  },
};

