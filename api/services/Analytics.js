const queryHelpers = require('./analyticsHelpers/queryHelpers')
const auditHelpers = require('./analyticsHelpers/auditHelpers')
const {AUDIT_TESTS} = require('../analyticsConstants')

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
      let {filters, dataset} = params
      //happens if coming from a GET query string
      if (typeof filters === "string") {
        filters = JSON.parse(filters)
      }

      let analyticsProfile
      ProviderAccounts.findOne({
        userId: user.id,
        id: filters.providerAccountId,
      })
      .then((account) => {
        const options = {dataset}
        const whomToAsk = queryHelpers.whomToAsk(dataset)

        const promises = []

        if (whomToAsk.includes("GoogleAnalytics")) {
          promises.push(GoogleAnalytics.getReport(account, filters, options))

        } else {
          promises.push("did-not-ask-them")
        }

        if (whomToAsk.includes("GoogleSearchConsole")) {
          promises.push(GoogleSearchConsole.getReport(account, filters, options))

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
              console.error("User: ", user.id, "ProfileId: ", filters.profileId, "WebsiteID: ", filters.websiteId);
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

  //TODO will have to set quotaUser param with each request to avoid the 10 api calls / ip / sec.
  //params:
  //  {
  //      endDate:
  //      startDate:
  //      websiteId:
  //      websiteUrl:
  //  }
  auditContent: (user, params, options) => {
    return new Promise((resolve, reject) => {
      let {filters, dataset} = params
      if (typeof filters === "string") {
        filters = JSON.parse(filters)
      }

      // set some defaults for the audits
      const gaFilters = Object.assign({
        pageSize: 10000, //max 10,000
      }, filters)

      const gscFilters = Object.assign({}, filters)

//console.log("filters", filters);
      // 1) get all dimensions + metric sets we have. Try to combine into one call if two auditTests share a dimension (will have the same date, at least as of now)
      const testKeys = Object.keys(AUDIT_TESTS)
      const reportRequestsData = {
        gaReports: [],
        gscReports: [],
      }
      for (let key of testKeys) {
        let testData = AUDIT_TESTS[key]
        let {gaReports = [], gscReports = []} = testData // each test could have multiple reports it requires; prepare all of them
        // add or combine each report for ga and gsc to what's there
        // can combine if has same dimension
        Analytics._buildAuditReportRequests("ga", gaReports, reportRequestsData.gaReports, gaFilters)
        Analytics._buildAuditReportRequests("gsc", gscReports, reportRequestsData.gscReports, gscFilters)
      }
      const reportRequestsFinal = _.cloneDeep(reportRequestsData)
//console.log("total ga report sets", reportRequestsData.gaReports);

      let gaReportCount, allReports, account, websiteGoals

      ProviderAccounts.findOne({
        userId: user.id,
        id: filters.providerAccountId,
      })
      .then((acct) => {
        account = acct
        if (!account) {
          throw new Error("Google account not for user ", user.id)
        }

        // they're picking by profile, which is specific to a web property, so only showing goals for tht web propertY
        return GoogleAnalytics.getGoals(account, {websiteId: filters.websiteId})//, profileId: filters.profileId, webPropertyId: filters.websiteId})
      })
      .then((goalData) => {
        websiteGoals = goalData.items || []

        // 3) for each test use the data and return results
        const promises = []
        // for ga, can send 5 reportSets at a time
        gaReportCount = 0
        while(reportRequestsData.gaReports.length && gaReportCount < 20) {
          let setOf5 = reportRequestsData.gaReports.splice(0, 5)
          //console.log("set of 5", setOf5);
          promises.push(GoogleAnalytics.getReport(account, setOf5, {
            dataset: "contentAudit-all",
            multipleReports: true,
          }))

          gaReportCount ++
        }

        let gscReportCount = 0
        reportRequestsData.gscReports.forEach((report) => {
          promises.push(GoogleSearchConsole.getReport(account, report, {
            dataset: "contentAudit-all",
            multipleReports: true,
          }))
          gscReportCount ++
        })

        return Promise.all(promises)
      })
      .then((result) => {
        // 4) with ga and gsc results, send through tests to see what passed
        // an array of ga reports and gsc reports
        const gaResultSets = result.splice(0, gaReportCount)
        // divide ga reportSets into individual reports
        const gaResults = Helpers.flatten(gaResultSets)
        const gscResults = result //whatevers left
        allReports = {gaResults, gscResults}

        const auditResults = {}
        console.log("---------------------");
        console.log("now going over tests");
        for (let key of testKeys) {
          auditResults[key] = auditHelpers.auditTestFunctions[key](gaResults, gscResults, websiteGoals)
        }

        Object.assign(auditResults, {allReports, reportRequests: reportRequestsFinal, websiteGoals})

        return resolve(auditResults)
      })
      .catch((err) => {
//        return reject(err)
//        debugging, so return all reports
        console.error(err);
        return resolve({allReports, err: err.toString(), reportRequests: reportRequestsFinal, websiteGoals})
      })
    })
  },



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

  // need to run once per GSC and GA, for each audit test we're going to make
  // otherFilters should be start and end date that kind of thing (and should be same for every report set)
  _buildAuditReportRequests: (api, auditTestReports, currentReportSets, otherFilters = {}) => {

    for (let report of auditTestReports) {
      let matchingReport = _.find(currentReportSets, (set) =>
        _.isEqual(set.dimensions, report.dimensions) &&
        // if ga, has to be same dimension filters and order bys too
        (
          api !== "ga" || (
            _.isEqual(set.dimensionFilterClauses, report.dimensionFilterClauses) &&
            (!set.orderBys || !report.orderBys || _.isEqual(set.orderBys, report.orderBys))
          )
        ) &&

        // if gsc, has to be same dimension groups too
        (api !== "gsc" || _.isEqual(set.dimensionFilterGroups, report.dimensionFilterGroups))
      )

      if (matchingReport) {
        matchingReport.metrics = (matchingReport.metrics || []).concat(report.metrics)

      } else {
        // build out the report with the otherFilters, and push
        let fullReport = Object.assign({}, report, otherFilters)

        currentReportSets.push(fullReport)
      }
    }
  },
}

module.exports = Analytics
