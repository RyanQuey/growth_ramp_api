/**
 * Campaign.js
 *
 * @description :: perhaps this would be better called a "campaignSet" . it is a group of campaigns, all drafted and sent at the same time, with the same "one click" (the famous one click of one click promotion)
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

    //!!!!!!!note that a given channel configuration, provider, or plan may change, but that won't actually change the campaign itself, once the campaign has been sent!!!!!!!!
var constants = require('../constants')
var CAMPAIGN_STATUSES = constants.CAMPAIGN_STATUSES
const UTM_TYPES = constants.UTM_TYPES

const providerWrappers = {
  FACEBOOK: Facebook,
  TWITTER: Twitter,
  LINKEDIN: LinkedIn,
}

module.exports = {

  attributes: {
    name: { type: 'string', defaultsTo: ''},
    //published once, on submit, even if its related posts aren't published until later
    publishedAt: { type: 'datetime' },
    status: { type: 'string', required: true, defaultsTo: CAMPAIGN_STATUSES[0], enum: CAMPAIGN_STATUSES },
    //often will be identical to its child posts' contentUrl, once those are actually made
    //maybe having both will be overkill?
    contentUrl: { type: 'string'},// (of what is being shared...LI has it as field) TODO regex to make sure real url
    //promotedContent: { type: 'json', defaultsTo: {url: ''} }, already did migration for this, but might not need it

    //Associations
    userId: { model: 'users', required: true },
    posts: {
      collection: 'posts',
      via: 'campaignId',
      dominant: true
    },

    planId: { model: 'plans' },
    /*providerAccounts: {
      collection: 'providerAccounts',
      via: 'campaigns',
      dominant: true
    },*/
  },

  autoCreatedAt: true,
  autoUpdatedAt: true,

  publish: (data) => {
    // - publish each post for each channelConfiguration(presumably, they would actually already be made when making the campaign draft)
    // - set utms for each (actually, maybe do this while writing draft also)
    // - update campaign status to published

    Posts.find({campaignId: data.campaignId}).populate('providerAccountId')
    .then((posts) => {
      const promises = []
      //not using FB's batch post sending for now

      for (let i = 0; i < posts.length; i++) {
        let post = posts[i]
        let account = post.providerAccountId

        //TODO make this a helper
        let utmList = ['campaignUtm', 'contentUtm', 'mediumUtm', 'sourceUtm', 'termUtm', 'customUtm'].map((type) => {
          return `${UTM_TYPES[type]}=${post[type]}`
        })
        let utms = utmList.join("&") //might use querystring to make sure there are no extra characters slipping in

        //api will be the api for the social network
        let api = providerWrappers[account.provider]
        api[post.channel](post, account, utms)
      }
    })
  },
};

