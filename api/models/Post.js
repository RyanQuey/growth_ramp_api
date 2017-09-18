/**
 * Post.js
 *
 * @description :: perhaps this would be better called a "postSet" . it is a group of messages, all drafted and sent at the same time, with the same "one click" (the famous one click of one click promotion)
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

    //!!!!!!!note that a given channel configuration, provider, or plan may change, but that won't actually change the message itself, once the message has been sent!!!!!!!!
module.exports = {

  attributes: {
    status: { type: 'string', required: true }, //("PUBLISHED", "DRAFT", "ARCHIVED")
    //Associations
    user: { model: 'user', required: true },
    messages: {
      collection: 'message',
      via: 'post',
      dominant: true
    },

    plan: { model: 'plan', required: true },
    providers: {
      collection: 'provider',
      via: 'posts',
      dominant: true
    },
  },

  autoCreatedAt: true,
  autoUpdatedAt: true,

  STATUSES: [
    "PUBLISHED",
    "DRAFT",
    "ARCHIVED"
  ]
};

