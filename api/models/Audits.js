/**
 * Audits.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

const queryHelpers = require('../services/analyticsHelpers/queryHelpers')
const auditHelpers = require('../services/analyticsHelpers/auditHelpers')
const {AUDIT_TESTS, TEST_GROUPS} = require('../analyticsConstants')

module.exports = {
  tableName: "audits",

  attributes: {
    status: { type: 'string', defaultsTo: "ACTIVE" },
    dataset: { type: 'string' }, //can be annual, monthly, etc...might use the dataset thing here

    //associations
    userId: { model: 'users', required: true },
    websiteId: { model: 'websites', required: true },
    auditLists: {
      collection: 'auditLists',
      via: 'auditId'
    },
    auditListItems: {
      collection: 'auditListItems',
      via: 'auditId'
    },
  },
  autoCreatedAt: true,
  autoUpdatedAt: true,

  //TODO will have to set quotaUser param with each request to avoid the 10 api calls / ip / sec.
  //params:
  //  {
  //      endDate:
  //      startDate:
  //      gaWebPropertyId:
  //      gaSiteUrl:
  //      gscSiteUrl:
  //      gaProfileId,
  //      ga
  //  }
  auditContent: (user, params, options) => {
    return new Promise((resolve, reject) => {
      let {dataset} = params

      // set some defaults for the audits
      const gaParams = Object.assign({
        pageSize: 10000, //max 10,000
        viewId: params.gaProfileId,
      }, params)

      const gscParams = Object.assign({}, params)

      let {testKeys, testGroup, specifyingTestBy} = queryHelpers.parseDataset(dataset)
      if (specifyingTestBy === "testGroup") {
        testKeys = TEST_GROUPS[testGroup]
      }
      // 1) get all dimensions + metric sets we have. Try to combine into one call if two auditTests share a dimension (will have the same date, at least as of now)
      const allTestKeys = Object.keys(AUDIT_TESTS)
      const reportRequestsData = {
        gaReports: [],
        gscReports: [],
      }
      for (let key of testKeys) {
        let testData = AUDIT_TESTS[key]
        let {gaReports = [], gscReports = []} = testData // each test could have multiple reports it requires; prepare all of them
        // add or combine each report for ga and gsc to what's there
        // can combine if has same dimension
        Audits._buildAuditReportRequests("ga", gaReports, reportRequestsData.gaReports, gaParams)
        Audits._buildAuditReportRequests("gsc", gscReports, reportRequestsData.gscReports, gscParams)
      }
      const reportRequestsFinal = _.cloneDeep(reportRequestsData)
//console.log("total ga report sets", reportRequestsData.gaReports);

      let gaReportCount, allReports, account, websiteGoals

      ProviderAccounts.findOne({
        userId: user.id,
        id: params.googleAccountId,
      })
      .then((acct) => {
        account = acct
        if (!account) {
          throw new Error("Google account not for user ", user.id)
        }

        // 3) for each test use the data and return results
        const promises = []
        // for ga, can send 5 reportSets at a time
        gaReportCount = 0
        while(reportRequestsData.gaReports.length && gaReportCount < 20) {
          let setOf5 = reportRequestsData.gaReports.splice(0, 5)
          //console.log("set of 5", setOf5);
          promises.push(GoogleAnalytics.getReport(account, setOf5, {
            dataset,
            multipleReports: true,
          }))

          gaReportCount ++
        }

        let gscReportCount = 0
        reportRequestsData.gscReports.forEach((report) => {
          promises.push(GoogleSearchConsole.getReport(account, report, {
            dataset,
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
        matchingReport.forLists = matchingReport.forLists.concat(report.forLists)

      } else {
        // build out the report with the otherFilters, and push
        let fullReport = Object.assign({}, report, otherFilters, {forLists: report.forLists})

        currentReportSets.push(fullReport)
      }
    }
  },
};

