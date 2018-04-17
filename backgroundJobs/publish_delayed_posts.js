var Job = require('./job');
var moment = require('moment');
var ALLOWED_EMAILS = require('../api/constants').ALLOWED_EMAILS

//sends any unsent delayed posts
module.exports = class PublishDelayedPosts extends Job {
  constructor (options) {
    super();
    this.now().every('5 minutes');

    this.running = false;
    return this;
  }

  run () {
    //sails.log.debug(moment().toString(), 'Check for new notifications!');
    if (this.running) {
      sails.log.debug('publishing delayed posts already running...');
      return;
    }

    this.running = true;
    const now = moment().format()

    const campaignsToPublish = {}
    let usersWithFailedPublishes, approvedUserIds
    let postsToPublish

    Posts.find({
      publishedAt: null,
      delayedUntil: {
        "!": null,
        "<=": now,
      },
    }).populate("campaignId").populate('providerAccountId').populate('channelId')
    .then((results) => {
      postsToPublish = results
      //publish by campaign; that is how the functions are already written, gets the accounts in a systematic way, makes sure to update campaign at the end, etc
      //console.log("some delayed posts that want to get published: ", postsToPublish.map((p) => `ID: ${p.id} ; delay time: ${p.delayedUntil} ; Published at?: ${p.publishedAt} `));
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

      return AccountSubscriptions.checkMultipleAccountStatuses(users)
    })
    .then((result) => {
      usersWithFailedPublishes = result.unpaidUsers
      //could map the postsToPublish to their respective user here
      approvedUserIds = result.approvedUserIds

      const campaignIds = Object.keys(campaignsToPublish)

      const approvedCampaignIds = campaignIds.filter((id) => {
        let campaignUserId = Helpers.safeDataPath(campaignsToPublish, `${id}.campaign.userId`, "")
        return approvedUserIds.includes(campaignUserId)
      })

      //console.log("approved campaigns: ", approvedCampaignIds);
      const promises2 = approvedCampaignIds.map((id) => {
        const data = campaignsToPublish[id]
        return Campaigns.publishCampaign(data.campaign, data.readyPosts)
      })

      return Promise.all(promises2)
    })
    .then((allResults) => {
      //console.log("Finished publishing delayed posts:");
      //console.log(allResults);

      // run this after posts are done, so doesn't interrupt them in any way, and keeps code cleaner
      if (usersWithFailedPublishes && usersWithFailedPublishes.length ) {
        //console.log("now WANT TO START sending notifications for failed publishes...but sadly not configured yet. Will raise ERROR so logs see it :)");
        //sails.log.debug("DIdn't publish for these users because not paid:",usersWithFailedPublishes.map((data) => Helpers.safeDataPath(data, "user.email", "unknown user") ));
      }

      return
    })
    .then(() => {

      this.running = false;
      return true;
    })
    .catch((err) => {
      sails.log.debug("Failed publishing delayed posts: ", err);
      this.running = false;
    })
  }
}
