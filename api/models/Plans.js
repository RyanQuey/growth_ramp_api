/**
 * Plan.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
import { PLAN_STATUSES } from "../constants"

module.exports = {

  attributes: {
    name: { type: 'string', required: true }, //"e.g., my favorite plan"
    status: { type: 'string', required: true, enum: PLAN_STATUSES, defaultsTo: PLAN_STATUSES[0]  },
    // posts does put the channel info on first level, so can query there. No reason to make the data readily accessible/normalized here in plans, where a plan can change constantly, and data can just be retrieved from the posts

    //currently not using, but migration has already been ran
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

      //NOTE: didn't like passing in array of postTemplateParams as an attribute of the planParams for some reason
      //this should be fine though
      Plans.create(planParams)
      .then((result) => {
        newPlan = result
        console.log(newPlan);
        const newPostTemplates = campaign.posts.map((post) => {
          let params = _.pick(post, [
            "channel",
            "providerAccountId",
            "userId",
            "campaignUtm",
            "mediumUtm",
            "sourceUtm",
            "contentUtm",
            "termUtm",
            "customUtm",
          ])

          params.planId = newPlan.id

          return params
        })

  console.log(newPostTemplates)
        //for (let i = 0; i < postTemplateParams.length; i++) {

        //}
        const promises = []
        promises.push(PostTemplates.create(newPostTemplates))
        promises.push(Campaigns.update(campaign.id, {planId: newPlan.id}))
        promises.push(Posts.update({campaignId: campaign.id}, {planId: newPlan.id}))

        return Promise.all(promises)
      })
      .then((results) => {
        console.log(results);
        return resolve(results)
      })
      .catch((err) => {
        return reject(err)
      })
    })
  },
};

