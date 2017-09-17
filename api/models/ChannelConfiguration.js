/**
 * ChannelConfiguration.js
 *
 * @description :: a channel configuration that belongs to a single user. A "channel" is a particular place within a provider to make a post or send message or whatever
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
  id
  planId: (belongs to one plan)
  type: "PERSONAL_POST",
  provider: "FACEBOOK",
  utmDefaults: the initial values in the field for this channel for this plan
    custom:
    medium: (use more constants...such as CHANNEL_NAME, PLAN_NAME, URL, )
    source:
    content:
    term:


 */

module.exports = {

  attributes: {
    type: { type: 'string', required: true },//"PERSONAL_POST",
    defaultMediumUtm: { type: 'string' },
    defaultSourceUtm: { type: 'string' },
    defaultContentUtm: { type: 'string' },
    defaultTermUtm: { type: 'string' },
    defaultCustomUtm: { type: 'string' },
    active: { type: 'boolean', defaultsTo: true },

    //associations
    plan: { model: 'plan', required: true },//the primary Association.
    provider: { model: 'provider', required: true },//"FACEBOOK",
    messages: {
      collection: 'message',
      through: 'post',
      via: 'channel'
    },
    posts: {
      collection: 'post',
      via: 'channels',
      dominant: true
    },
    user: { model: 'user', required: true }
  },

  //all possible types that can be in the types column, and some data about them
  TYPES: {
    USER_POST: "USER_POST"
  }
}


