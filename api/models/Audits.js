/**
 * Audits.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

const queryHelpers = require('../services/analyticsHelpers/queryHelpers')
const auditHelpers = require('../services/analyticsHelpers/auditHelpers')
const {AUDIT_TESTS, TEST_GROUPS} = require('../analyticsConstants')
const momentTZ = require('moment-timezone')

module.exports = {
  attributes: {
    status: { type: 'string', defaultsTo: "ACTIVE" },
    dateLength: { type: 'string' }, //year, month, quarter

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

  //params:
  //  {
  //      dateLength:
  //      gaWebPropertyId:
  //      gaSiteUrl:
  //      gscSiteUrl:
  //      gaProfileId,
  //      testGroup,
  //      googleAccountId,
  //      websiteId,
  //  }
  auditContent: (user, params, options) => {
    return new Promise((resolve, reject) => {
      let auditRecord

      params.endDate = momentTZ.tz("America/Los_Angeles").format("YYYY-MM-DD")

      if (params.dateLength === "month") {
        params.startDate = momentTZ.tz("America/Los_Angeles").subtract(1, "month").format("YYYY-MM-DD") //NOTE: date is calculated in PST time
      } else if (params.dateLength === "year") {
        params.startDate = momentTZ.tz("America/Los_Angeles").subtract(1, "month").format("YYYY-MM-DD") //NOTE: date is calculated in PST time

      } else if (params.dateLength === "quarter") {
        params.startDate = momentTZ.tz("America/Los_Angeles").subtract(3, "months").format("YYYY-MM-DD") //NOTE: date is calculated in PST time
      }

      // set some defaults for the audits
      const gaParams = Object.assign({
        pageSize: 10000, //max 10,000
        viewId: params.gaProfileId,
      }, params)

      const gscParams = Object.assign({}, params)

      const testKeys = TEST_GROUPS[params.testGroup]

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

      let gaReportCount, allReports, account

      ProviderAccounts.findOne({
        userId: user.id,
        id: params.googleAccountId,
      })
      .then((acct) => {
        account = acct
        if (!account) {
          throw new Error("Google account not for user ", user.id, "google account id", params.googleAccountId)
        }

        // 3) for each test use the data and return results
        const promises = []
        // for ga, can send 5 reportSets at a time
        gaReportCount = 0
        while(reportRequestsData.gaReports.length && gaReportCount < 20) {
          let setOf5 = reportRequestsData.gaReports.splice(0, 5)
          //console.log("set of 5", setOf5);
          promises.push(GoogleAnalytics.getReport(account, setOf5, {
            dataset: "contentAudit",
            multipleReports: true,
          }))

          gaReportCount ++
        }

        let gscReportCount = 0
        reportRequestsData.gscReports.forEach((report) => {
          promises.push(GoogleSearchConsole.getReport(account, report, {
            dataset: "contentAudit",
            multipleReports: true,
          }))
          gscReportCount ++
        })

        promises.push(Audits.create({
          userId: user.id,
          websiteId: params.websiteId,
          dateLength: params.dateLength,
        }))

        return Promise.all(promises)
      })
      .then((result) => {
        // 4) with ga and gsc results, send through tests to see what passed
        auditRecord = result.pop()

        // an array of ga reports and gsc reports
        const gaResultSets = result.splice(0, gaReportCount)
        // divide ga reportSets into individual reports
        const gaResults = Helpers.flatten(gaResultSets)
        const gscResults = result //whatevers left
        allReports = {gaResults, gscResults}

        console.log("---------------------");
        console.log("now going over tests");
        const testResults = {}
        const promises2 = []
        for (let testKey of testKeys) {
          // test the data to see what passes/fails for their site for each test we do
          testResults[testKey] = auditHelpers.auditTestFunctions[testKey](gaResults, gscResults)

          // persist each test's lists
          testResults[testKey].auditLists.forEach((list) => {
            promises2.push(AuditLists.persistList({testKey, list, auditParams: params, auditRecord, user}))
          })
        }

        return Promise.all(promises2)
      })
      .then((auditLists) => {
        // auditLists is an array of lists, with populated auditListItems
        auditRecord.auditLists = auditLists
        const ret = Object.assign({}, {audit: auditRecord, allReports, reportRequests: reportRequestsFinal})

        return resolve(ret)
      })
      .catch((err) => {
//        return reject(err)
//        debugging, so return all reports
        console.error(err);

        auditRecord && Audits.update({id: auditRecord.id}, {status: "ARCHIVED"})

        // just return anyway, but with all the metadata
        return resolve({allReports, err: err.toString(), reportRequests: reportRequestsFinal, failedAuditParams: auditRecord || {
          userId: user.id,
          websiteId: params.websiteId,
          dateLength: params.dateLength,
        }})
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
        let fullReport = Object.assign({},
          report,
          otherFilters,
          {forLists: report.forLists},
        )

        currentReportSets.push(fullReport)
      }
    }
  },
};

