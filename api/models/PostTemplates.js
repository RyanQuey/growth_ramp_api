/**
 * MessageTemplates.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

import { PROVIDER_STATUSES, PROVIDERS, ALL_CHANNEL_TYPES, UTM_TYPES, POST_TEMPLATE_STATUSES, ALL_POSTING_AS_TYPES, TEMPLATE_PROPERTIES } from "../constants"

module.exports = {
  tableName: "postTemplates",

  attributes: {
    //might want this; would need migration
    //name: { type: 'string' },//eg "my friendly post",
    channelType: { type: 'string', required: true, enum: ALL_CHANNEL_TYPES },//eg "PERSONAL_POST"
    provider: { //should always match the provider account provider
      type: 'string',
      required: true,
      enum: Object.keys(PROVIDERS)
    }, //"e.g., FACEBOOK"
    postingAs: { type: 'string', defaultsTo: "SELF", enum: ALL_POSTING_AS_TYPES}, //could also be "PAGE" etc. depending on the channelType

    campaignUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    mediumUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    sourceUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    contentUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    termUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    //migration ran, but not supporting
    //customUtm: { type: 'json', defaultsTo: {active: true, value: '', key: '' } }, //key will be like instead of campaign, it is the key

    status: { type: 'string', defaultsTo: POST_TEMPLATE_STATUSES[0], enum: POST_TEMPLATE_STATUSES }, //don't just delete, these might be a pain for users to come up with

    //Associations
    providerAccountId: {
      model: 'providerAccounts',
      required: true,
    },
    channelId: { model: 'channels' },
    userId: {
      model: 'users',
      required: true,
    }, //will be the userid, until it is populated (.populate('user'))
    planId: {
      model: 'plans',
      required: true,
    },
    posts: {
      collection: 'posts',
      via: 'postTemplateId',
    },
  },

  //called when matching plan to campaign
  createFromPost: (post, plan) => {
console.log("creating from post");
    return new Promise((resolve, reject) => {
      let params = _.pick(post, TEMPLATE_PROPERTIES)
      if (params.channelId === "") {delete params.channelId}
      params.planId = plan.id
      //strictly troubleshooting
      //lastParams = params
      let newTemplate

      return PostTemplates.create(params)
      .then((t) => {
        newTemplate = t
        //might not need to update the plan, if plan is not being created, but only updated. But this makes it easy :)
        return Posts.update({id: post.id}, {postTemplateId: newTemplate.id, planId: plan.id})
      })
      .then((result) => {
        const updatedPost = result
console.log("finished creating from post");
        return resolve({updatedPost, newTemplate})
      })
      .catch((err) => {
        sails.log.error(err)
      })
    })
  }
}
