/**
 * Posts.js
 *
 * @description :: this is a single message to a single provider, which are kept on record for the utm Codes and future analytics
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

const constants = require('../constants')
const UTM_TYPES = constants.UTM_TYPES

import { PROVIDER_STATUSES, PROVIDERS } from "../constants"
const providerWrappers = {
  FACEBOOK: Facebook,
  TWITTER: Twitter,
  LINKEDIN: LinkedIn,
}
module.exports = {

  attributes: {
    //stuff to use to create the posted message
    text: { type: 'string' }, //caption/comment for the post
    channelType: { type: 'string', required: true },
    provider: { //should always match the provider account provider
      type: 'string',
      required: true,
      enum: Object.keys(PROVIDERS)
    }, //"e.g., FACEBOOK"

    //[{
    //  url: ,
    //  type: VIDEO, or IMAGE
    //}, {...]
    uploadedContent: { type: 'array' },
    //could use same rgex as frontend, from https://gist.github.com/dperini/729294
    contentUrl: { type: 'string', defaultsTo: "", url: true},// (of what is being shared...LI has it as field) TODO regex to make sure real url
    shortUrl: { type: 'string', url: true },// (of what is being shared...LI has it as field) TODO regex to make sure real url
    //
    //must be successfully posted for this to be set
    publishedAt: { type: 'datetime' },
    //user set time. Stays same even if not successful on first attempt
    delayedUntil: { type: 'datetime' },

    campaignUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    mediumUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    sourceUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    contentUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    termUtm: { type: 'json', defaultsTo: {active: true, value: ''} },
    //migration ran, but not supporting
    //customUtm: { type: 'json', defaultsTo: {active: true, value: '', key: '' } }, //key will be like instead of campaign, it is the key


    //stuff we might get back from the provider
    postUrl: { type: 'string'},// (link they can follow);
    postKey: { type: 'string'},// (LI gives it, others might too, for updating the message)
    visibility: { type: 'string'},// LinkedIn wants this

    //Associations
    userId: { model: 'users', required: true },
    campaignId: { model: 'campaigns', required: true },
    channelId: { model: 'channels' },
    //note that a given channelType configuration, provider, or plan may change, but that one actually change the message itself, once the message has been sent
    providerAccountId: { model: 'providerAccounts', required: true },
    planId: { model: 'plans'},
    //only if post was created from a plan, not if plan was created from a post
    //I don't know if use case for the latter, so that's why. ALready have planId too
    //seems mostly helpful if still drafting... (?)... if at all.
    postTemplateId: { model: 'postTemplates'},
  },

  // don't need these because it's part of post already
  // TODO might add??
  autoCreatedAt: false,
  autoUpdatedAt: false,

  shortenUrl: (post) => {
    return new Promise((resolve, reject) => {
      if (!post.contentUrl) {
        console.log("no url provided; skip sending");
        return resolve(post)
      }

      let utmList = ['campaignUtm', 'contentUtm', 'mediumUtm', 'sourceUtm', 'termUtm', 'customUtm']
      .filter((type) => (post[type] && post[type].active && post[type].value))
      .map((type) => {
        if (type === "customUtm") {
          return `${post[type].key}=${post[type].value}`
        } else {
          return `${UTM_TYPES[type]}=${post[type].value}`
        }
      })
      let utms = utmList.join("&") //might use querystring to make sure there are no extra characters slipping in

      let updatedPost

      Google.shortenUrl(`${post.contentUrl}?${utms}`)
      .then((shortUrl) => {
        return Posts.update(post.id, {shortUrl: shortUrl})
      })
      .then((result) => {
        updatedPost = result[0]
        return resolve(updatedPost)
      })
      .catch((err) => {
        return reject(err)
      })
    })

  },

  //NOTE: be sure not to name it "publish"; for some reason, gets called by create/update also when you do (?)
  publishPost: (post) => {
    return new Promise((resolve, reject) => {
      let account = post.providerAccountId
      let channel = post.channelId
      let updatedPost

      Posts.shortenUrl(post)
      .then((u) => {
        updatedPost = u
        //api will be the api for the social network
        let api = providerWrappers[account.provider]

        //publishes post on social network
        return api.createPost(account, updatedPost, channel)
      })
      .then((result) => {
        //some providers only have url or key, not both
        return Posts.update({id: updatedPost.id}, {
          publishedAt: moment.utc().format(),
          postUrl: result.postUrl || "",
          postKey: result.postKey || "",
        })
      })
      .then((p) => {
        //only updating and returning one post
        return resolve(p[0])
      })
      .catch((err) => {
        console.log("Failure posting to social network");
        console.log(err);
        return reject(err)
      })
    })
  },

};

