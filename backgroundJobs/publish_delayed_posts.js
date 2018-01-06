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

      //find unique campaigns
      const campaignsToPublish = {}

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
      }

      const campaignIds = Object.keys(campaignsToPublish)
      const promises = campaignIds.map((id) => {
        const data = campaignsToPublish[id]
        return Campaigns.publishCampaign(data.campaign, data.readyPosts)
      })

      return Promise.all(promises)
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
