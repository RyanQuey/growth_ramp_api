const queryHelpers = require('./analyticsHelpers/queryHelpers')
const auditHelpers = require('./analyticsHelpers/auditHelpers')
const {AUDIT_TESTS, TEST_GROUPS} = require('../analyticsConstants')

const Analytics = {

  //for a given user, get all of their analytics accounts (GA, GSC...add more later?)
  getAllAccounts: (user) => {
    return new Promise((resolve, reject) => {
      ProviderAccounts.find({
        userId: user.id,
        provider: "GOOGLE",
      })
      .then((accounts) => {
        //get all real Google accounts for user
        // just manually filtering for now; basically just as fast (can't imagine there will ever be a lot of accounts to filter
        const googleAccounts = accounts.filter((a) => !a.unsupportedProvider)
        const promises = [
          GoogleAnalytics.getAllGAAccounts(googleAccounts),
          GoogleSearchConsole.getAllGSCAccounts(googleAccounts)
        ]
        return Promise.all(promises)
      })
      .then(([gaAccounts, gscAccounts]) => {
        return resolve({gaAccounts, gscAccounts})
      })
      .catch((err) => {
        reject(err)
      })
    })
  },

  //wrapper around GoogleAnalytics.getReport currently, until other analytics apis are added
  getAnalytics: (user, params) => {
    return new Promise((resolve, reject) => {
      let {dataset} = params

      let analyticsProfile
      ProviderAccounts.findOne({
        userId: user.id,
        id: params.googleAccountId,
      })
      .then((account) => {
        const options = {dataset}
        const whomToAsk = queryHelpers.whomToAsk(dataset)

        const promises = []

        if (whomToAsk.includes("GoogleAnalytics")) {
          promises.push(GoogleAnalytics.getReport(account, params, options))

        } else {
          promises.push("did-not-ask-them")
        }

        if (whomToAsk.includes("GoogleSearchConsole")) {
          promises.push(GoogleSearchConsole.getReport(account, params, options))

        } else {
          promises.push("did-not-ask-them")
        }

        return Promise.all(promises)
      })
      .then(([GAResults, GSCResults]) => {
        const result = Analytics._combineResultsFromApis(GAResults, GSCResults)
        return resolve(result)
      })
      .catch((err) => {
        if (err.code) { //codes GR made
          switch (err.code) {
            case "no-rows-for-profile":
              console.error("User: ", user.id, "ProfileId: ", params.gaProfileId, "WebsiteID: ", params.websiteId);
              break
            default:
              console.error("Error from getting analytics:");
          }
        } else {
          console.error("Error from getting analytics: ");
        }

        return reject(err)
      })
    })
  },


//TODO move these helpers to auditHelpers file

  // so far, only asking one api at a time, but will change this helper if that changes
  _combineResultsFromApis: (GAResults, GSCResults) => {
    let ret
    if (GAResults === "did-not-ask-them") {
      ret = GSCResults

    } else if (GSCResults === "did-not-ask-them") {
      ret = GAResults
    }

    return ret
  },

}

module.exports = Analytics
