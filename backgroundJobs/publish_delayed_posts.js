var Job = require('./job');
var moment = require('moment');

//sends any unsent notifications
module.exports = class PublishDelayedPosts extends Job {
  constructor (options) {
    super();
    this.now().every('10 minutes');

    this.running = false;
    return this;
  }

  run () {
    //sails.log.debug(moment().toString(), 'Check for new notifications!');
    if (this.running) {
      sails.log.debug('already running...');
      return;
    }

    this.running = true;
    const now = moment().format()

    const campaignsToPublish = {}
    const usersWithFailedPublishes = []

    Posts.find({
      publishedAt: null,
      delayedUntil: {
        "!": null,
        "<=": now,
      },
    }).populate("campaignId").populate('providerAccountId').populate('channelId')
    .then((postsToPublish) => {
sails.log.debug(postsToPublish, now);
      //publish by campaign; that is how the functions are already written, gets the accounts in a systematic way, makes sure to update campaign at the end, etc

      if (!postsToPublish || !postsToPublish.length) {
        return []
      }

      const uniqueUserIds = []

      //find unique campaigns
      for (let post of postsToPublish) {
        let campaign = post.campaignId
        //get it the same as how it would be if publishing post after pressing publish campaign button
        post.campaignId = campaign.id

        //map it out
        if (!campaignsToPublish[campaign.id]) {
          campaignsToPublish[campaign.id] = {campaign, readyPosts: [post]}
        } else {
          campaignsToPublish[campaign.id].readyPosts.push(post)
        }

        if (!uniqueUserIds.includes(post.userId)) {
          uniqueUserIds.push(post.userId)
        }
      }

      return Users.find({id: uniqueUserIds})
    })
    .then((users) => {
      if (!users || !users.length) {
        return []
      }

      //copies regular posting flow
      const promises = users.map((user) => {
        return new Promise((resolve, reject) => {
          AccountSubscriptions.checkStripeStatus(user.id)
          .then((sub) => {
            if (!ALLOWED_EMAILS.includes(user.email) && (!sub || ["past_due", "canceled", "unpaid", null].includes(sub.subscriptionStatus))) {
              usersWithFailedPublishes.push({
                user: user,
                error: {message: "Payment is required before user can publish", code: "delinquent-payment"},
              })

              return resolve({userId: user.id, status: "rejected"} )
            } else {
              return resolve({userId: user.id, status: "accepted"})
            }

          })
          .catch((err) => {
            sails.log.debug("Failure checking stripe while posting delayed post for ", user.email);
            sails.log.debug(err);

            return resolve({userId: user.id, status: "rejected"} )
          })

        })

      })
    })
    .then((results) => {
      const approvedUserIds = results.filter((r) => r.status === "accepted" && r.userId)

      const campaignIds = Object.keys(campaignsToPublish)
      const approvedCampaignIds = campaignIds.filter((id) => {
        let campaignUserId = campaignsToPublish[id].campaign.userId
        return approvedUserIds.includes(campaignUserId)
      })

      const promises2 = approvedCampaignIds.map((id) => {
        const data = campaignsToPublish[id]
        return Campaigns.publishCampaign(data.campaign, data.readyPosts)
      })

      return Promise.all(promises2)
    })
    .then((allResults) => {
      console.log("Finished publishing delayed posts:");
      console.log(allResults);
      this.running = false;
      return true;
    })
    .catch((err) => {
      sails.log.debug("Failed publishing delayed posts: ", err);
      this.running = false;
    })
  }
}