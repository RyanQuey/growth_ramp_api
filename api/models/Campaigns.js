/**
 * Campaign.js
 *
 * @description :: perhaps this would be better called a "campaignSet" . it is a group of campaigns, all drafted and sent at the same time, with the same "one click" (the famous one click of one click promotion)
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

    //!!!!!!!note that a given postTemplate, provider, or plan may change, but that won't actually change the campaign itself, once the campaign has been sent!!!!!!!!
import { CAMPAIGN_STATUSES, } from "../constants"

module.exports = {

  attributes: {
    name: { type: 'string', defaultsTo: ''},
    //published once, on submit, even if its related posts aren't published until later
    publishedAt: { type: 'datetime' },
    status: { type: 'string', required: true, defaultsTo: CAMPAIGN_STATUSES[0], enum: CAMPAIGN_STATUSES },
    //often will be identical to its child posts' contentUrl, once those are actually made. But maybe having both will be overkill?
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

  afterUpdate: (updatedRecord, cb) => {
    Posts.update({campaignId: updatedRecord.id}, {contentUrl: updatedRecord.contentUrl})

    cb()
  },

  //sets posts and utms of a campaign to match the newly updated planId
  matchToPlan: (params) => {
    return new Promise((resolve, reject) => {

      let plan, currentCampaignRecord
      //Front end should already block, but this makes sure
      Campaigns.findOne(params.id).populate('posts')
      .then((c) => {
        currentCampaignRecord = c

        //make sure it's ok to change
        if (
          currentCampaignRecord.posts && currentCampaignRecord.posts.length &&
          currentCampaignRecord.planId != params.planId
        ) {
          throw "Cannot set plan if posts are already made for this campaign"
        }
        //should only happen if plan is not set yet
        if (
          currentCampaignRecord.planId &&
          currentCampaignRecord.planId != params.planId
        ) {
          throw "Cannot change plan if plan is already set"
        }

        return Plans.findOne(params.planId).populate('postTemplates')
      })
      .then((p) => {
        plan = p

        //current record has a validated user id, so this check will make sure requesting user has access to this plan
        if (plan.userId !== currentCampaignRecord.userId) {
          throw "Forbidden: this is not your plan"
        }
        const newPosts = plan.postTemplates.map((template) => {
          let post = _.pick(template, [
            "channelType",
            "channelId",
            "campaignUtm",
            "provider",
            "mediumUtm",
            "sourceUtm",
            "contentUtm",
            "termUtm",
            "customUtm",
            "providerAccountId",
            "userId",
            "planId",
          ])

          post.postTemplateId = template.id
          post.campaignId = currentCampaignRecord.id

          return post
        })

        const promises = []
        promises.push(Posts.create(newPosts))

        //perform the regular update, in case name, contentUrl were also changed. BUt also updates the planId
        promises.push(Campaigns.update(currentCampaignRecord.id, params))

        return Promise.all(promises)
      })
      .spread((posts, c) => {
        let campaign = Object.assign({}, c[0])
        campaign.posts = posts
        //so will return updated campaign object, just as regular Campaigns.update would, but with populated posts
        return resolve(campaign)
      })
      .catch((err) => {
        return reject(err)
      })

    })

  },

  //NOTE: be sure not to name it "publish"; for some reason, gets called by create/update also when you do (?)
  publishCampaign: (campaign) => {
    // - check each access token, and refresh if necessary
    // - publish each post  (presumably, they would actually already be made when making the campaign draft)
    // - set utms for each (actually, maybe do this while writing draft also)
    // - update campaign status to published
    return new Promise((resolve, reject) => {
      let posts, postResults, allAccessTokenData
      //if null publishedAt, is not published yet
      Posts.find({campaignId: campaign.id, publishedAt: null}).populate('providerAccountId').populate('channelId')
      .then((p) => {
        //check access tokens
        //hopefully the API has given this all along, but not there yet, and good to check anyways
        posts = p
        //technically providerAccountId is required so this shouldn't be necessary, but whatever
        _.remove(posts, (post) => !post.providerAccountId)


        let allAccounts = posts.reduce((acc, post) => {
          //remove duplicate accounts
          let match = acc.find((account) => account.id === post.providerAccountId.id)
          if (!match || match === -1) {
            acc.push(post.providerAccountId)
          }

          return acc
        }, [])

        const getTokenPromises = allAccounts.map((account) =>
          //returns access tokens and access token secrets if applicable
          ProviderAccounts.getUserToken(account, "access")
        )

        return Promise.all(getTokenPromises)
      })
      .then((results) => {
//console.log(results);
        //getUserToken also try to refresh, so at this point they just need to reauthenticate
        const accountsMissingTokens = results.filter((r) => r.code === "no-token-retrieved")

        //objects with accessToken and accessTokenSecret (if applicable)
        //organized by accountId
        allAccessTokenData = results.reduce((acc, r) => {
          if (!r.code || r.code !== "no-token-retrieved") {

            acc[r.accountId] = r
          }
          return acc
        }, {})
console.log("all tokens", allAccessTokenData);
        //these accounts don't have tokens, and couldn't even refresh. Should just
        if (accountsMissingTokens.length ) {
          //also an array, so still works
          throw new Error(`Could not get tokens for: ${accountsMissingTokens.join(", ")}`)
        }

        //this should never have to happen, but just make sure
        //NOTE post should always have same contentUrl as campaign
        if (campaign.contentUrl && posts.some((post) => !post.contentUrl || post.contentUrl !== campaign.contentUrl)) {
          return Posts.update({
            campaignId: campaign.id,
            contentUrl: "",
          }, {
            contentUrl: campaign.contentUrl
          })

        } else {
          return null
        }
      })
      .then((results) => {
        //in case an update happened
        if (results) {
          //each will be returned as an array with one entry, the one post that got updated
          posts = results.map((result) => result[0])
        }

        const promises = []
        //not using FB's batch post sending for now

        for (let i = 0; i < posts.length; i++) {
          let post = posts[i]
          //whether or not provider account is populated
          let accessTokenData = allAccessTokenData[post.providerAccountId.id || post.providerAccountId]
          promises.push(Posts.publishPost(post, accessTokenData))
        }

        return Promise.all(promises)
      })
      .then((r) => {
        postResults = r
        //results will be a mixture of successes and failures
        //failures should have a message and code property, and status 500 on the object
        //not throwing though, just let it all go through

        return Campaigns.update(campaign.id, {
          publishedAt: moment.utc().format(),
          status: "PUBLISHED",
        })
      })
      .then((c) => {
        let campaign = Object.assign({}, c[0])
        campaign.posts = postResults
        //so will return updated campaign object, just as regular Campaigns.update would, but with populated posts
        return resolve(campaign)
      })
      .catch((err) => {
        console.log(err);
        return reject(err)
      })
    })
  },
	getAnalytics: (campaign) => {
    let posts
    return Posts.find({campaignId: campaign.id}).populate("channelId")
    .then((ps) => {
      posts = ps

      //get analytics for each link
      const promises = posts.map((post) => Google.getUrlAnalytics(post.shortUrl, {alwaysResolve: true}))
      return Promise.all(promises)
    })
    .then((results) => {
      //will be returned in the same order as the posts, so:
      for (let i = 0; i < posts.length; i++) {
        posts[i].analytics = results[i].analytics || results[i] //if error, won't be any analytics prop, but will still return data
      }
      return posts
    })
    .catch((err) => {
      console.log("Failed to get analytics for ", shortUrl);
      return err
    })
  },
};

