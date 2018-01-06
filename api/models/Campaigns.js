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

    //object with all utms for this campaign, paired with corresponding shortLink. at least of published posts (will generate for unpublished posts when they get published)
    //this way, shortLinks are reusable
    utmSets: { type: 'json', defaultsTo: {} },

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
console.log("now in campaign afterUpdate hook", updatedRecord);
    Posts.update({campaignId: updatedRecord.id}, {
      contentUrl: updatedRecord.contentUrl
    })
    .then((posts) => {
console.log("now updated ", posts.length, "posts after updating campaign");
      cb()
    })
    .catch((err) => {
      sails.log.debug("error in after updating campaign hook: ", err);
      sails.log.debug("Still continuing though");
      cb()
    })

  },

  //sets posts and utms of a campaign to match the newly updated planId
  matchToPlan: (params) => {
    return new Promise((resolve, reject) => {

      let plan, currentCampaignRecord
      //Front end should already block if has posts, but this makes sure
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

        //make sure params have first priority, since they will be used to update campaign in a second
        let currentContentUrl = params.contentUrl || currentCampaignRecord.contentUrl
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

          if (currentContentUrl) {post.contentUrl = currentContentUrl}

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
  //if postsToPublish is blank, just publish all undelayed unpublished ones (ie, when you hit the publish all button).
  //if full, is the only posts to publish (ie, when publishing delayed psots)
  publishCampaign: (campaign, postsToPublish) => {
    // - check each access token, and refresh if necessary
    // - publish each post  (presumably, they would actually already be made when making the campaign draft)
    // - set utms for each (actually, maybe do this while writing draft also)
    // - update campaign status to published
    return new Promise((resolve, reject) => {
      let posts, postResults, allAccessTokenData, allPosts
      //if null publishedAt, is not published yet

      //need channel record to get access token at the end
      //need account record to get other access token, if making
      Posts.find({campaignId: campaign.id}).populate('providerAccountId').populate('channelId')
      .then((p) => {
        //check access tokens
        //hopefully the API has given this all along, but not there yet, and good to check anyways

        allPosts = p

        //Only send posts that aren't delayed or the delay has passed, and are not published
        posts = postsToPublish || allPosts.filter(post => (
          post.publishedAt === null && (
            !post.delayedUntil ||
            moment.utc().isAfter(moment.utc(post.delayedUntil))
          )
        ))

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
        //getUserToken also try to refresh, so at this point they just need to reauthenticate
        const accountsMissingTokens = results.filter((r) => r.code === "no-token-retrieved") || []

        //objects with accessToken and accessTokenSecret (if applicable)
        //organized by accountId
        allAccessTokenData = results.reduce((acc, r) => {
          if (!r.code || r.code !== "no-token-retrieved") {
            acc[r.accountId] = r
          }
          return acc
        }, {})

        //these accounts don't have tokens, and couldn't even refresh. Should never have allowed them to press the publish button
        if (accountsMissingTokens.length ) {
          //also an array, so still works
          throw new Error(`Could not get tokens for: ${accountsMissingTokens.join(", ")}`)
        }

        //this should never have to happen, but just make sure
        //NOTE post should always have same contentUrl as campaign
        if (campaign.contentUrl && posts.some((post) => !post.contentUrl || post.contentUrl !== campaign.contentUrl)) {
          return Posts.update({
            campaignId: campaign.id,
          }, {
            contentUrl: campaign.contentUrl
          })

        } else {
          return null
        }
      })
      .then((results) => {
        //if update happened
        if (results) {
          //each will be returned as an array with one entry, the one post that got updated
          let updatedPosts = results.map((result) => result[0]).filter((p) => !p)
          posts = Helpers.combineArraysOfRecords(posts, updatedPosts, ["contentUrl"])
        }

        //get / set short urls
        return Campaigns._handleCampaignShortUrls(campaign, posts)
      })
      .then((updatedRecords) => {
        //if !updatedRecords, didn't need to update
        if (updatedRecords && updatedRecords !== "no-updates") {
          //update the current vars
          //nothing populated; just update
          campaign = updatedRecords.updatedCampaign
        }

        //final check: Make sure every post has short url if it has content url. Is our fault, API error, probably because link was made, but we didn't set it right.
        if (campaign.contentUrl && posts.some((p) => !p.shortUrl)) {
          throw {
            message: "GR failed to set ShortUrl for some reason",
            code: "api-short-url-failure",
            status: 500,
          }
        }

        //now publish all in a new promise all
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
        // NOTE: really should not have to check !post.publishedAt...but thjis just adds some fool proofing
        const failedPosts = postResults.filter((post) => post.error || !post.publishedAt)

        const delayedPosts = allPosts.filter(post => (
          post.delayedUntil &&
          !moment.utc().isAfter(moment.utc(post.delayedUntil))
        ))

        const publishedPosts = allPosts.filter(post => post.publishedAt)
        //we're all done
        if (!failedPosts.length && !delayedPosts.length) {
          return Campaigns.update({id: campaign.id}, {
            publishedAt: moment.utc().format(),
            status: "PUBLISHED",
          })

        //if published any right now OR published some in past
        } else if (failedPosts.length !== postResults.length || publishedPosts.length) {
          return Campaigns.update({id: campaign.id}, {
            //can use updatedAt to see when it was
            status: "PARTIALLY_PUBLISHED",
            publishedAt: null, //in case was previously marked as pub'd
          })
        }
      })
      .then((c) => {
        console.log("updated campaign");
        let updatedCampaign = Object.assign({}, c[0])
        updatedCampaign.posts = postResults //DO NOT POPULATE! Need to have error prop on the posts, as is returned here

        //so will return updated campaign object, just as regular Campaigns.update would, but with populated posts
        return resolve(updatedCampaign)
      })
      .catch((err) => {
        console.log(err);
        return reject(err)
      })
    })
  },

	getAnalytics: (campaign) => {
    let posts
    return new Promise((resolve, reject) => {
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
          posts[i].analytics = results[i].analytics || results[i]//if error, won't be any analytics prop, but will still return data
          posts[i].analytics.longUrl = results[i].longUrl
        }
        return resolve(posts)
      })
      .catch((err) => {
        return reject(err)
      })

    })
  },

  //for use when publishing:
  //gets all the new short urls we need, but uses the ones we already have too, if relevant
  //updates posts with short urls
  //updates campaign to keep track of what happened so far
  _handleCampaignShortUrls: (campaign, posts) => {
    if (campaign.contentUrl) {
      let updatedPosts, updatedCampaign

      //get all the unique short urls we'll need for published posts
      let newSets = {}
      let currentSets = campaign.utmSets || {}
      //make a new object with same strings, but also list of posts to update
      let currentUtmStrings = Object.keys(currentSets)
      let postsForCurrentSets = {}

      for (let str of currentUtmStrings) {
        postsForCurrentSets[str] = {posts: []}
      }

      const promises = []

      for (let i = 0; i < posts.length; i++) {
        let post = posts[i]
        let utmString = Helpers.extractUtmString(post, campaign)

        if (currentSets[utmString]) {
          !currentSets[utmString].posts.includes(post.id) && currentSets[utmString].posts.push(post.id)

        } else if (newSets[utmString]) {
          newSets[utmString].posts.push(post.id)

        } else {
          newSets[utmString] = {
            posts: [post.id],
          }
        }
      }

      //shorten all links and update all corresponding posts
      let newUtmStrings = Object.keys(newSets)

      const shortenAndUpdate = (str) => {
        return Google.shortenUrl(`${campaign.contentUrl}?${str}`)
        .then((shortUrl) => {
          newSets[str].shortUrl = shortUrl
          let postsToUpdate = newSets[str].posts || []
          return Posts.update({id: postsToUpdate}, {shortUrl: shortUrl})
        })
      }

      //////////////////
      //RUNNING IT!!!!//
      //////////////////
      //for all new shortLinks, get new short link and update post
      for (let str of newUtmStrings) {
        promises.push(shortenAndUpdate(str))
      }

      //for all already existing shortLinks, KEEP short link and update post
      for (let str of currentUtmStrings) {
        let postsToUpdate = currentSets[str].posts || []
        promises.push(
          Posts.update({id: postsToUpdate}, {
            shortUrl: currentSets[str].shortUrl
          })
        )
      }

      //returning a bunch of promises, first one is set of arrays with posts inside, last one
      return Promise.all(promises)
      .then((results) => {
        //flatten the remaining promises results before setting
        updatedPosts = [].concat.apply([], results)
        //merge records, so channel and provideraccount id are still populated

        updatedPosts = Helpers.combineArraysOfRecords(posts, updatedPosts, ["shortUrl"])

        //only update campaign after all these finish, lest there are errors updating the posts and some posts never get a shortUrl, because forever stuck in "currentSets"
        //set to campaign, for future reference and if need to publish its other posts later
        const combinedUtmSets = Object.assign({}, currentSets, newSets)

        return Campaigns.update({id: campaign.id}, {
          utmSets: combinedUtmSets,
        })
      })
      .then((results) => {
        const updatedCampaign = results[0]
        return {
          updatedCampaign,
          updatedPosts,
        }
      })
      .catch((err) => {
        throw err
      })

    } else {
      //return message, to cue that didn't need to update stuff
      return Promise.resolve("no-updates")
    }

  },

};

