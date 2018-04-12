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

  canAuditSite: ({website, audits}) => {
    const oneMonthAgo = moment().subtract(1, "month")
    const recentAudits = audits.filter((audit) => oneMonthAgo.isBefore(audit.createdAt))

    //website needs at least one audit but no recent audits
    //TODO eventually don't want to rely on createdAt, in case we have to retroactively create an audit for a previous week or something, and so can't change createdAt, and yeah.
    // not sure how the system will work yet though, with each list having different start and end dates? so will look into later
    //Want at least one audit, so they don't accidentally click the Audit Site button right after this starts to run adn they get two or something
    return audits.length > 0 && recentAudits.length === 0
  },

  // params: see below for keys that params should have
  // website should have audits and customLists populated on it
  // by the time this func gets called, should already be validated that this should run (authenticated etc)
  auditContent: (params, options = {}) => {
    return new Promise((resolve, reject) => {
      let auditRecord
      const {user, website, dateLength, testGroup, endDate = null} = params //endDate is optional. Mostly will be set dynamically by process below. startDate, at least for now, will always be set by proces below
      const {gaWebPropertyId, gaSiteUrl, gscSiteUrl, gaProfileId, googleAccountId, audits, customLists} = website

      // if endDate is specified, use that (NOTE currently not doing). Otherwise:
      if (!params.endDate) {
        if (false && website.audits && website.audits.length) {
          // TODO if previous audits, default startDate to day after last audit was ran. (just in case audit doesn't get ran on right day or something, doesn't leave a gap) But will want to probably do dynamically by each list? So will not end up setting all list start and end dates here, but will set each list individually based on the last audit's list with that same listKey. Wait until discuss with Jason, see use cases etc before goig either way

          params.startDate = "?"
          params.endDate = auditHelpers.getEndDateFromStartDate(params.startDate, dateLength)

        } else {
          // else default to yesterday
          params.endDate = momentTZ.tz("America/Los_Angeles").subtract(1, "day").format("YYYY-MM-DD")
          params.startDate = auditHelpers.getStartDateFromEndDate(params.endDate, dateLength)
        }
      }


      // set some defaults for the audits
      const gaParams = Object.assign({
        pageSize: 10000, //max 10,000
        viewId: gaProfileId,
        testGroup,
      }, website)
      const gscParams = Object.assign({testGroup,}, website)

      const testKeys = TEST_GROUPS[testGroup]

      // 1) get all dimensions + metric sets we have. Try to combine into one call if two auditTests share a dimension (will have the same date, at least as of now)
      const allTestKeys = Object.keys(AUDIT_TESTS)
      const reportRequestsData = { // these will be built out by reports needed for each test
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

      // for each customList see what reports it needs
      for (let customList of customLists) {
        // gaReports and gscReports of same format as the AUDIT_TESTS constant returned
        const {gaReports, gscReports} = CustomLists.getAPIReportsFromCustomLists(customList)

        Audits._buildAuditReportRequests("ga", gaReports, reportRequestsData.gaReports, gaParams)
        Audits._buildAuditReportRequests("gsc", gscReports, reportRequestsData.gscReports, gscParams)
      }

      const reportRequestsFinal = _.cloneDeep(reportRequestsData)

      let gaReportCount, allReports, account

      ProviderAccounts.findOne({
        userId: user.id,
        id: googleAccountId,
      })
      .then((acct) => {
        account = acct
        if (!account) {
          throw new Error("Google account not for user ", user.id, "google account id", googleAccountId)
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
          websiteId: website.id,
          dateLength: dateLength,
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
          testResults[testKey] = auditHelpers.auditTestFunctions[testKey](gaResults, gscResults, customLists)

          // persist each test's lists
          testResults[testKey].auditLists.forEach((list) => {
            promises2.push(AuditLists.persistList({testKey, list, auditParams: params, auditRecord, user}))
          })
        }

        // persist results from custom lists as well
        testResults.customLists = {}
        for (let customList of customLists) {
          const customListKey = CustomLists.getCustomListKey(customList)
          testResults.customLists[customListKey] = auditHelpers.auditTestFunctions.customLists(gaResults, gscResults, customList)

          // persist each test's lists
console.log("results from custom list", testResults.customLists[customListKey]);
          testResults.customLists[customListKey].auditLists.forEach((list) => {
            promises2.push(AuditLists.persistList({
              testKey: customList.testKey,
              list,
              auditParams: params,
              auditRecord,
              user,
              isCustomList: true,
              customList,
            }))
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

        console.log("audit failed, so archiving that audit");
        auditRecord && Audits.update({id: auditRecord.id}, {status: "ARCHIVED"})

        // just return anyway, but with all the metadata
        return resolve({allReports, err: err.toString(), reportRequests: reportRequestsFinal, failedAuditParams: auditRecord || {
          userId: user.id,
          websiteId: params.website.id,
          dateLength: params.dateLength,
        }})
      })
    })
  },

  // need to run once per GSC and GA, for each audit test we're going to make
  // otherFilters should be start and end date that kind of thing (and should be same for every report set)
  _buildAuditReportRequests: (api, auditTestReports, currentReportSets, otherFilters = {}) => {

    for (let report of auditTestReports) {
      // see if there's a report that we can reuse
      let matchingReport = _.find(currentReportSets, (set) =>
        _.isEqual(set.dimensions, report.dimensions) &&
        // if ga, has to be same dimension filters and order bys too
        (
          api !== "ga" || (
            _.isEqual(set.dimensionFilterClauses, report.dimensionFilterClauses) &&
            (!set.orderBys || !report.orderBys || _.isEqual(set.orderBys, report.orderBys)) //TODO in future can just do all orderBys in the frontend, which would solve need for sending any orderBys, so can combine more requests if need be
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

