/**
 * Campaign.js
 *
 * @description :: perhaps this would be better called a "campaignSet" . it is a group of campaigns, all drafted and sent at the same time, with the same "one click" (the famous one click of one click promotion)
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

    //!!!!!!!note that a given channel configuration, provider, or plan may change, but that won't actually change the campaign itself, once the campaign has been sent!!!!!!!!
var constants = require('../constants')
var CAMPAIGN_STATUSES = constants.CAMPAIGN_STATUSES

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


  beforeValidate: (values, cb) => {
    //TODO probably there's a better way to make sure it isn't already shortened...
    if (values.contentUrl && !values.contentUrl.includes('goo.gl')) {

    }
    cb();
  },

  publish: (campaign) => {
    // - check each access token, and refresh if necessary
    // - publish each post for each channelConfiguration(presumably, they would actually already be made when making the campaign draft)
    // - set utms for each (actually, maybe do this while writing draft also)
    // - update campaign status to published

    return new Promise((resolve, reject) => {
      let posts, postResults

      Posts.find({campaignId: campaign.id}).populate('providerAccountId')
      .then((p) => {
        //check access tokens
        //hopefully the API has given this all along, but not there yet, and good to check anyways
        posts = p
console.log(posts);
        //technically providerAccountId is required, but whatever
        _.remove(posts, (post) => !post.providerAccountId)

        let allAccounts = posts.reduce((acc, post) => {
          //remove duplicate accounts
          let match = acc.find((account) => account.id === post.providerAccountId.id)
console.log("match");
console.log(match);
          if (!match) {
            acc.push(post.providerAccountId)
          }

          return acc
        }, [])

        const getTokenPromises = allAccounts.map((account) =>
          ProviderAccounts.getUserToken(account, "access")
        )

console.log(getTokenPromises);
  console.log("now checking/refreshing access tokens");
        return Promise.all(getTokenPromises)
      })
      .then((results) => {
console.log(results);
        //getUserToken also try to refresh, so at this point they just need to reauthenticate
        const accountsMissingTokens = results.filter((r) => r.code === "no-token-retrieved")
        const accessTokens = results.filter((r) => !r.code || r.code !== "no-token-retrieved")

  console.log("accounts missing tokens");
  console.log(accountsMissingTokens);
  console.log("access tokens");
  console.log(accessTokens);
        if (accountsMissingTokens.length ) {
          //also an array, so still works
          return accountsMissingTokens
        }

        const promises = []
        //not using FB's batch post sending for now

        for (let i = 0; i < posts.length; i++) {
          let post = posts[i]
          promises.push(Posts.publish(post))
        }

        return Promise.all(promises)
      })
      .then((r) => {
        postResults = r
        //results will be a mixture of successes and failures
        //failures should have a message and code property, and status 500 on the object
        //not throwing though, just let it all go through
  console.log("finished trying to publish");
  console.log(postResults);

        return Campaigns.update(campaign.id, {
          publishedAt: moment.utc().format(),
          status: "PUBLISHED",
        })
      })
      .then((c) => {
        return resolve({campaign: c, posts: postResults})
      })
      .catch((err) => {
        console.log(err);
        return reject(err)
      })
    })
  },
};

