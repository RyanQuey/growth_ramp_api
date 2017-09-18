/**
 * Plan.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    name: { type: 'string', required: true }, //"e.g., my favorite plan"
    status: { type: 'string', required: true }, //("PUBLISHED", "DRAFT", "ARCHIVED")
    //Association
    user: { model: 'user', required: true },

    providers: {//(necessary to toggle entire providers without messing up channel configurations)
      collection: 'provider',
      via: 'plans',
      dominant: true
    },

    channelConfigurations: { type: 'json', defaultsTo: {} },
      /*
        type: { type: 'string', required: true },//"PERSONAL_POST",
        defaultMediumUtm: { type: 'string' },
        defaultSourceUtm: { type: 'string' },
        defaultContentUtm: { type: 'string' },
        defaultTermUtm: { type: 'string' },
        defaultCustomUtm: { type: 'string' },
        active: { type: 'boolean', defaultsTo: true },
      */
    posts: {
      collection: 'post',
      via: 'plan'
    },
    messages: {
      collection: 'message',
      via: 'plans',
      through: 'post'
    },
  },
  autoCreatedAt: true,
  autoUpdatedAt: true,
};

