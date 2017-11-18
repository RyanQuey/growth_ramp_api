/**
 * MessageTemplates.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */


import { POST_TEMPLATE_STATUSES } from "../constants"
module.exports = {

  attributes: {
    name: { type: 'string', required: true },//eg "my friendly post",
    channel: { type: 'string', required: true },//eg "PERSONAL_POST",
    campaignUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    mediumUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    sourceUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    contentUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    termUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    customUtm: { type: 'json', defaultsTo: {active: true, value: '' } },
    status: { type: 'string', defaultsTo: POST_TEMPLATE_STATUSES[0], enum: POST_TEMPLATE_STATUSES }, //don't just delete, these might be a pain for users to come up with

    //Associations
    providerAccountId: {
      model: 'providerAccounts',
      required: true,
    },
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
}
