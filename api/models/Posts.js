/**
 * Post.js
 *
 * @description :: perhaps this would be better called a "postSet" . it is a group of messages, all drafted and sent at the same time, with the same "one click" (the famous one click of one click promotion)
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

    //!!!!!!!note that a given channel configuration, provider, or plan may change, but that won't actually change the message itself, once the message has been sent!!!!!!!!
var POST_STATUSES = require('../constants').POST_STATUSES

module.exports = {

  attributes: {
    status: { type: 'string', required: true, enum: POST_STATUSES },
    timeSent: { type: 'datetime' },
    //Associations
    user: { model: 'users', required: true },
    messages: {
      collection: 'messages',
      via: 'post',
      dominant: true
    },

    plan: { model: 'plans', required: true },
    providers: {
      collection: 'providers',
      via: 'posts',
      dominant: true
    },
  },

  autoCreatedAt: true,
  autoUpdatedAt: true,

};

