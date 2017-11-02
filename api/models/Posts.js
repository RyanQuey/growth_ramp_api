/**
 * Post.js
 *
 * @description :: perhaps this would be better called a "postSet" . it is a group of messages, all drafted and sent at the same time, with the same "one click" (the famous one click of one click promotion)
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

    //!!!!!!!note that a given channel configuration, provider, or plan may change, but that won't actually change the message itself, once the message has been sent!!!!!!!!
var constants = require('../constants')
var POST_STATUSES = constants.POST_STATUSES
const UTM_TYPES = constants.UTM_TYPES

const providerWrappers = {
  FACEBOOK: Facebook,
  TWITTER: Twitter,
  LINKEDIN: LinkedIn,
}

module.exports = {

  attributes: {
    status: { type: 'string', required: true, defaultsTo: POST_STATUSES[0], enum: POST_STATUSES },
    publishedAt: { type: 'datetime' },

    //Associations
    userId: { model: 'users', required: true },
    messages: {
      collection: 'messages',
      via: 'postId',
      dominant: true
    },

    planId: { model: 'plans' },
    /*providerAccounts: {
      collection: 'providerAccounts',
      via: 'posts',
      dominant: true
    },*/
  },

  autoCreatedAt: true,
  autoUpdatedAt: true,

  publish: (data) => {
    // - publish each message for each channelConfiguration(presumably, they would actually already be made when making the post draft)
    // - set utms for each (actually, maybe do this while writing draft also)
    // - update post status to published

    Messages.find({postId: data.postId}).populate('providerAccountId')
    .then((messages) => {
      const promises = []
      //not using FB's batch message sending for now

      for (let i = 0; i < messages.length; i++) {
        let message = messages[i]
        let account = message.providerAccountId

        //TODO make this a helper
        let utmList = ['campaignUtm', 'contentUtm', 'mediumUtm', 'sourceUtm', 'termUtm', 'customUtm'].map((type) => {
          return `${UTM_TYPES[type]}=${message[type]}`
        })
        let utms = utmList.join("&") //might use querystring to make sure there are no extra characters slipping in

        //api will be the api for the social network
        let api = providerWrappers[account.provider]
        api[message.channel](message, account, utmsx)
      }
    })
  },
};

