var Job = require('./job');
var moment = require('moment');
var ALLOWED_EMAILS = require('../api/constants').ALLOWED_EMAILS

// searches all user websites and runs audits on it for that week or month or year or whatever
module.exports = class RoutineAudits extends Job {
  constructor (options) {
    super();
    this.now().every('30 minutes');

    this.running = false;
    return this;
  }

  run () {
    if (this.running) {
      sails.log.debug('routine audits already running...');
      return;
    }

    this.running = true;
    const oneMonthAgo = moment().subtract(1, "month").format()

    let websitesToAudit, users, usersWithFailedAudits, approvedUserIds
    let uniqueUserIds = []

    Websites.find({status: "ACTIVE"})
    .populate("audits", {
      status: "ACTIVE",
      dateLength: "month",
      createdAt: {">": oneMonthAgo},
    })
    .then((results) => {
      // if has any monthly audits in the last month, don't run for this site
      websitesToAudit = results.filter((site) => !site.audits.length)
console.log("bg job auditing websites:", websitesToAudit.map((w) => w.id));

      for (let site of websitesToAudit) {
        if (!uniqueUserIds.includes(site.userId)) {
          uniqueUserIds.push(site.userId)
        }
      }
      return Users.find({id: uniqueUserIds})
    })
    .then((result) => {
      users = result
      return AccountSubscriptions.checkMultipleAccountStatuses(users)
    })
    .then((result) => {
      usersWithFailedAudits = result.unpaidUsers
      approvedUserIds = result.approvedUserIds
      const approvedWebsitesToAudit = websitesToAudit.filter((website) => approvedUserIds.includes(website.userId))

      //console.log("approved campaigns: ", approvedCampaignIds);
      const promises2 = approvedWebsitesToAudit.map((website) => {
        const websiteUser = _.find(users, (user) => user.id === website.userId)
        const params = Object.assign({
          dateLength: "month",
          testGroup: "nonGoals",
          websiteId: website.id,
        },
          _.pick(website, ["gaWebPropertyId", "gaSiteUrl", "gscSiteUrl", "gaProfileId", "googleAccountId"])
        )

        return Audits.auditContent(websiteUser, params)
      })

      return Promise.all(promises2)
    })
    .then((allResults) => {
      //TODO map out results, if any were failed because of authorization, send email/do something to let them know
      //console.log("Finished publishing delayed posts:");
      //console.log(allResults);

      // run this after posts are done, so doesn't interrupt them in any way, and keeps code cleaner
      if (usersWithFailedAudits && usersWithFailedAudits.length ) {
        //console.log("now WANT TO START sending notifications for failed publishes...but sadly not configured yet. Will raise ERROR so logs see it :)");
        //sails.log.debug("DIdn't publish for these users because not paid:",usersWithFailedAudits.map((data) => Helpers.safeDataPath(data, "user.email", "unknown user") ));
      }
console.log("all results", allResults.length);
      return
    })
    .then(() => {
      this.running = false;
      return true;
    })
    .catch((err) => {
      sails.log.error("Error auditing websites: ", err);
      this.running = false;
    })
  }
}
