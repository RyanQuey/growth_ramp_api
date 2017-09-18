/**
 * Message.js
 *
 * @description :: this is a single message to a single provider, which are kept on record for the utm Codes and future analytics
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
   post: [postId] belongs to one
   channelConfiguration: belongs to one
   utm: {
     custom: false or undefined if not, a string if yes
     enabled: Boolean
     medium:
     source:
     content:
     term:
   },
   thumbnail: [string for data storage]
 */

module.exports = {

  attributes: {
    thumbnail: { type: 'string' }, //[string for data storage]
    mediumUtm: { type: 'string' },
    sourceUtm: { type: 'string' },
    contentUtm: { type: 'string' },
    termUtm: { type: 'string' },
    customUtm: { type: 'string' },
    //Association
    user: { model: 'user', required: true },
    post: { model: 'post', required: true },
    //note that a given channel configuration, provider, or plan may change, but that one actually change the message itself, once the message has been sent
    provider: { model: 'provider', required: true },
    plan: { model: 'plan', required: true }
  },
  // don't need these because it's part of post already
  autoCreatedAt: false,
  autoUpdatedAt: false
};

