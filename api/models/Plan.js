/**
 * Plan.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    name: { type: 'string', required: true }, //"e.g., my favorite plan"
    //Association
    user: { model: 'user', required: true },

    providers: {//(necessary to toggle entire providers without messing up channel configurations)
      collection: 'provider',
      via: 'plan',
      dominant: true
    },
    channelConfigurations: {
      collection: 'channelConfiguration',
      via: 'user'
    },
    posts: {
      collection: 'post',
      via: 'plan'
    },
    messages: {
      collection: 'message',
      through: 'posts',
      via: 'plan'
    },
  },
  autoCreatedAt: true,
  autoUpdatedAt: true,
};

