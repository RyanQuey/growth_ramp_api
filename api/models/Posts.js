/**
 * Posts.js
 *
 * @description :: this is a single message to a single provider, which are kept on record for the utm Codes and future analytics
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */


import { PROVIDER_STATUSES, PROVIDERS, ALL_CHANNEL_TYPES, ALL_POSTING_AS_TYPES } from "../constants"
const providerApiWrappers = {
  FACEBOOK: Facebook,
  TWITTER: Twitter,
  LINKEDIN: LinkedIn,
}

module.exports = {

  attributes: {
    //stuff to use to create the posted message
    text: { type: 'string' }, //caption/comment for the post
    channelType: { type: 'string', required: true, enum: ALL_CHANNEL_TYPES },//eg "PERSONAL_POST"
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
    publishedAt: { type: 'datetime', defaultsTo: null },
    //user set time. Stays same even if not successful on first attempt
    delayedUntil: { type: 'datetime' },
    postingAs: { type: 'string', defaultsTo: "SELF", enum: ALL_POSTING_AS_TYPES}, //could also be "PAGE" etc. depending on the channelType

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

  /* NO LONGER USING; just shortening with campaign, to make sure identical links share shortened url
  shortenUrl: (post) => {
    return new Promise((resolve, reject) => {
      if (!post.contentUrl) {
        console.log("no url provided; skip sending");
        return resolve(post)
      }

      const utmString = Posts.extractUtmString(post)

      let updatedPost

      Google.shortenUrl(`${post.contentUrl}?${utmString}`)
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
  */

  //NOTE: be sure not to name it "publish"; for some reason, gets called by create/update also when you do (?)
  //do not call without doing all fo the checks done in Campaigns.publishCampaign
  //accessTokenData is object with {accessToken: (decrypted) and accessTokenSecret: (if applicable. also decrypted)}
  publishPost: (post, accessTokenData) => {
    return new Promise((resolve, reject) => {
      let account = post.providerAccountId
      let channel = post.channelId
      //set a separate variable each step along the way, so I know how far we got.
      let publishedButNotUpdatedPost, publishedPost

      if (!accessTokenData) {
        //should already have been retrieved. If this is the case, it's too late.
        // see the catch at the bottom for what I'm doing here
        throw {
          code: 'require-reauthorization'
        }
      }

      //api will be the api for the social network
      let api = providerApiWrappers[account.provider]

      //publishes post on social network
      return api.createPost(account, post, channel, accessTokenData)
      .then((result) => {
        publishedButNotUpdatedPost = {
          publishedAt: moment.utc().format(),
          postUrl: result.postUrl || "",
          postKey: result.postKey || "",
        }

        //some providers only have url or key, not both
        return Posts.update({id: post.id}, publishedButNotUpdatedPost)
      })
      .then((p) => {
        //only updating and returning one post
        publishedPost = p[0]
        return resolve(publishedPost)
      })
      .catch((err) => {
        //TODO send us an email or something
        console.log("Failure posting to social network");
        //IMPORTANT: still resolving no matter what, so other posts that do get posted are updated etc correctly
        let ret

        //originalError will be from the provider hopefully, unless our api just failed
        //working from getting the farthest to barely starting:

        if (publishedButNotUpdatedPost) {
          //if this happens...all our fault. But still, have to deal with
          console.log("*****************");
          console.log("SHOULD_NEVER_GET_HERE:");
          console.log(err);
          console.log("*****************");
          ret = Object.assign({}, publishedButNotUpdatedPost, {
            error: {
              code: "published-but-failed-to-save",
              originalError: err.originalError || err,
            }
          })

        } else if (post) {
          console.log("*****************");
          console.log("FAILED_TO_PUBLISH_TO_PROVIDER:");
          console.log(err);
          console.log("*****************");
          ret = Object.assign({}, post, {
            //ideally, set the specific code for why failed in the provider api wrapper
            error: {
              code: err.code || "failed-to-publish-unknown",
              originalError: err.originalError || err,
            }
          })

        } else {

          //failed to even pass in a post...
          //Hopefully all will fail
          return resolve({error: {code: "no-post", originalError: err}})
        }

        //update our records real quick if possible
        if (['require-reauthorization', 'insufficient-permissions'].includes(err.code)) {
console.log("now updating PROVIDER ", post.providerAccountId.id);
          let accountId = post.providerAccountId.id || post.providerAccountId
          if (post.channelType === "PERSONAL_POST") {
            ProviderAccounts.update({id: accountId}, {
              accessToken: null,
              accessTokenSecret: null,
              accessTokenExpires: null,
              refreshToken: null,
              refreshTokenExpires: null,
            })
            .then((a) => {console.log(a);})

          } else {
            //at least invalidate the scope
            //blank out channel accessToken, in case it has one too
            ProviderAccounts.update({id: accountId}, {
              accessToken: null,
              accessTokenSecret: null,
              accessTokenExpires: null,
              refreshToken: null,
              refreshTokenExpires: null,
              scopes: {}, //TODO probably actually want to set each current one to "declined" rather than "granted"...but that's for later. Also, only block out the ones that are breaking here. will have to retrieve the record and everything
            })
            .then((a) => {console.log(a);})

            post.channelId && Channels.update({id: post.channelId}, {
              accessToken: null,
              accessTokenExpires: null,
            })
            .then((a) => {console.log(a);})
          }
            //personal credentials are messed up
          //access token, refresh token, secret, expires, scopes are all off. Need it again

        }

        //returning post object with as much updating as happened, and

        console.log("__________________________________________________");
        console.log("returning anyway, to allow other posts to continue");
        console.log("__________________________________________________");
        return resolve(ret)
      })
    })
  },

};

