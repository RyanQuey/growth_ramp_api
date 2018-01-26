/**
 * PseudopostTemplates.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

import { UNSUPPORTED_PROVIDERS, ALL_CHANNEL_TYPES, ALL_POSTING_AS_TYPES } from "../constants"
module.exports = {

/*
  attributes: {
    channelType: { type: 'string', required: true, enum: ALL_CHANNEL_TYPES },//eg "PERSONAL_POST"
    provider: { //should always match the provider account provider
      type: 'string',
      required: true,
      enum: Object.keys(UNSUPPORTED_PROVIDERS)
    }, //"e.g., FACEBOOK"

    postingAs: { type: 'string', defaultsTo: "SELF", enum: ALL_POSTING_AS_TYPES}, //could also be "PAGE" etc. depending on the channelType
    status: { type: 'string', defaultsTo: POST_TEMPLATE_STATUSES[0], enum: POST_TEMPLATE_STATUSES }, //don't just delete, these might be a pain for users to come up with

    campaignUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    mediumUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    sourceUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    contentUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    termUtm: { type: 'json', defaultsTo: {active: true, value: ''} },

    visibility: { type: 'string'},

    //Associations
    userId: { model: 'users', required: true },
    channelId: { model: 'channels' },
    providerAccountId: { model: 'providerAccounts', required: true },
    planId: { model: 'plans'},

    //only if ppost was created from a plan, not if plan was created from a ppost
    pseudopostId: { model: 'postTemplates'},
  },

  autoCreatedAt: true,
  autoUpdatedAt: true,
*/

};



