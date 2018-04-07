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
      // handle successes/ errors
      this.handleResults({allResults, users, websites: websitesToAudit, usersWithFailedAudits})

      this.running = false;
      return true;
    })
    .catch((err) => {
      //NOTE audits that fail don't go here, just resolve anyway
      sails.log.error("Error auditing websites: ", err);
      this.running = false;
    })
  }

  // gets all results
  // each result is the return value of the Audits.auditContent()
  handleResults ({allResults, users, websites, usersWithFailedAudits}) {
    const successPromises = []
    let failurePromises

    for (let result of allResults) {
      let matchingUser, matchingWebsite
      if (result.err) {
        matchingUser = _.find(users, (user) => user.id === result.failedAuditParams.userId)
        usersWithFailedAudits.push(matchingUser)

      } else {
        // success!
        matchingUser = _.find(users, (user) => user.id === result.audit.userId)
        matchingWebsite = _.find(websites, (website) => website.id === result.audit.websiteId)
        // just sending one per website no matter what for now, even if same user gets more than one email
        successPromises.push(Notifier.newAuditNotification({user: matchingUser, email: matchingUser.email, website: matchingWebsite}))

      }
    }

    // TODO warn users about failed ones??? OR at least just make an error message so we can fix it, and then try to message later or something...
    failurePromises = usersWithFailedAudits


    const promises = successPromises.concat(failurePromises)

    return Promise.all(promises)
  }

  handleSuccess (success) {
    return new Promise((resolve, reject) => {

    })
  }

  handleFailure (failure) {
    return new Promise((resolve, reject) => {

    })
  }
}
