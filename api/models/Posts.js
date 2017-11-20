/**
 * Posts.js
 *
 * @description :: this is a single message to a single provider, which are kept on record for the utm Codes and future analytics
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    //stuff to use to create the posted message
    text: { type: 'string' }, //caption/comment for the post
    channel: { type: 'string', required: true },
    //[{
    //  url: ,
    //  type: VIDEO, or IMAGE
    //}, {...]
    uploadedContent: { type: 'array' },
    contentUrl: { type: 'string'},// (of what is being shared...LI has it as field) TODO regex to make sure real url
    //
    //must be successfully posted for this to be set
    publishedAt: { type: 'datetime' },
    //user set time. Stays same even if not successful on first attempt
    delayedUntil: { type: 'datetime' },

    campaignUtm: { type: 'string', defaultsTo: '' },//{ active: true, value: 'string' }, //
    mediumUtm: { type: 'string', defaultsTo: ''  },
    sourceUtm: { type: 'string', defaultsTo: ''  },
    contentUtm: { type: 'string', defaultsTo: ''  },
    termUtm: { type: 'string', defaultsTo: ''  },
    customUtm: { type: 'string', defaultsTo: ''  },

    //stuff we might get back from the provider
    postUrl: { type: 'string'},// (link they can follow);
    postKey: { type: 'string'},// (LI gives it, others might too, for updating the message)
    visibility: { type: 'string'},// LinkedIn wants this

    //Associations
    userId: { model: 'users', required: true },
    campaignId: { model: 'campaigns', required: true },
    //note that a given channel configuration, provider, or plan may change, but that one actually change the message itself, once the message has been sent
    providerAccountId: { model: 'providerAccounts', required: true },
    planId: { model: 'plans'},
    postTemplateId: { model: 'postTemplates'},
  },
  // don't need these because it's part of post already
  autoCreatedAt: false,
  autoUpdatedAt: false
};

