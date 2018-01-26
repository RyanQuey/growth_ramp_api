/**
 * Pseudoposts.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */


import { UNSUPPORTED_PROVIDERS, ALL_CHANNEL_TYPES, ALL_POSTING_AS_TYPES, POST_TEMPLATE_STATUSES } from "../constants"

module.exports = {
/*
  attributes: {
    channelType: { type: 'string', required: true, enum: ALL_CHANNEL_TYPES },//eg "PERSONAL_POST"
    provider: { //should always match the provider account provider
      type: 'string',
      required: true,
      enum: Object.keys(UNSUPPORTED_PROVIDERS)
    }, //"e.g., FACEBOOK"

    //could use same rgex as frontend, from https://gist.github.com/dperini/729294
    contentUrl: { type: 'string', defaultsTo: "", url: true},// (of what is being shared...LI has it as field) TODO regex to make sure real url
    shortUrl: { type: 'string', url: true },// (of what is being shared...LI has it as field) TODO regex to make sure real url

    status: { type: 'string', defaultsTo: POST_TEMPLATE_STATUSES[0], enum: POST_TEMPLATE_STATUSES }, //don't just delete, these might be a pain for users to come up with

    // let user set this? Or timer/publish immediately like rest of campaign?
    publishedAt: { type: 'datetime', defaultsTo: null },
    //user set time. Stays same even if not successful on first attempt
    delayedUntil: { type: 'datetime' },
    postingAs: { type: 'string', defaultsTo: "SELF", enum: ALL_POSTING_AS_TYPES}, //could also be "PAGE" etc. depending on the channelType

    campaignUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    mediumUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    sourceUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    contentUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    termUtm: { type: 'json', defaultsTo: {active: true, value: ''} },

    visibility: { type: 'string'},
    //stuff we might get back from the provider for post; users can set it perhaps
    postUrl: { type: 'string'},// (link they can follow);

    //Associations
    userId: { model: 'users', required: true },
    campaignId: { model: 'campaigns', required: true },
    channelId: { model: 'channels' },
    //note that a given channelType configuration, provider, or plan may change, but that one actually change the message itself, once the message has been sent
    providerAccountId: { model: 'providerAccounts', required: true },
    planId: { model: 'plans'},

    //only if ppost was created from a plan, not if plan was created from a ppost
    pseudoposts: {
      collection: 'postTemplates',
      via: 'postTemplateId',
    },
  },

  autoCreatedAt: true,
  autoUpdatedAt: true,

*/

};


