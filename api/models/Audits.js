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
const _ = require('lodash')

module.exports = {
  attributes: {
    status: { type: 'string', defaultsTo: "ACTIVE" }, //can be PENDING if in middle of audit, or
    baseDate: { type: 'date', required: true }, // lists will probably have a life of their own regarding when they start and end. But audits need a base date (typically the same as the lists' end date), in case they were created at a date different from when they were supposed to have been ran theoretically. Ie can audit retroactively. Should be one day before the audit was ran though if everything always worked perfectly
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

  canAuditSite: ({website, audits, params = {}, user}, options = {}) => {
    // this assumes only monthly audits.
    // subtract an extra day since base date is one day before the present, so want one month before that.
    const oneMonthAgoAndOne = moment().subtract(1, "month").subtract(1, "day")
    const recentAudits = audits.filter((audit) => oneMonthAgoAndOne.isBefore(audit.baseDate))

    //website needs at least one audit but no recent audits
    //Want at least one audit, so they don't accidentally click the Audit Site button right after this starts to run adn they get two or something
    return (
      (!options.inBackgroundJob || audits.length > 0) &&
      recentAudits.length === 0
    ) || (
      // if super, allowing them to pass in params as long as there isn't already one with that same baseDate (assuming that if no basedate matches, that's good enough)
      !options.inBackgroundJob &&
      Users.isSuper(user) &&
      params.baseDate &&
      !_.some(audits, audit => moment(audit.baseDate).isSame(params.baseDate, "day"))
    )
  },

  //for creating brand new audits, with all their lists and items
  //Params should be same params to pass into #getAuditData
  //auditContent: (params, options = {}) => {
  createNewAudit: (params, options = {}) => {
    return new Promise((resolve, reject) => {
      //not really using testGroup at this point, ha
      const {user, website, dateLength, testGroup, baseDate = null} = params //baseDate is optional. Mostly will be set dynamically by process below. startDate, at least for now, will always be set by proces below
      const {audits, customLists} = website
      let auditRecord, allReports, reportRequests, testResults

      // get the params.baseDate and params.startDate
      // if baseDate is specified, use that (NOTE currently not doing). Otherwise:
      if (!params.baseDate) {
        if (website.audits && website.audits.length) {
          // if previous audits, default startDate to day after last audit was ran.

          const lastAudit = auditHelpers.getLatestAudit(audits)
          const lastAuditEndDate = lastAudit.baseDate || lastAudit.createdAt.add(1, "month") //since if has no baseDate, is only for one month, since that's all we did at that time. //TODO once this gets ran a couple times, can remove the createdAt time fallback; just should matter for test env
          params.startDate =  moment(lastAuditEndDate).add(1, "day").format("YYYY-MM-DD")
          params.baseDate = auditHelpers.getEndDateFromStartDate(params.startDate, dateLength)

        } else {
          // else default to yesterday
          params.baseDate = momentTZ.tz("America/Los_Angeles").subtract(1, "day").format() // this is the form that baseDate gets persisted on the audit. But will be sent as YYYY-MM-DD when sent as endDate to google
          params.startDate = auditHelpers.getStartDateFromEndDate(params.baseDate, dateLength)
        }

      } else {
        // base date sent in http req

        params.startDate = auditHelpers.getStartDateFromEndDate(params.baseDate, dateLength)
      }

      Audits._getAuditData(params, options)
      .then((result) => {
        allReports = result.allReports
        reportRequests = result.reportRequests
        testResults = result.testResults

        return Audits.create({
          userId: user.id,
          websiteId: website.id,
          dateLength: dateLength,
          baseDate: params.baseDate,
          status: "PENDING",
        })
      })
      .then((audit) => {
        auditRecord = audit
        const promises = []

        const testKeys = TEST_GROUPS[testGroup]
        for (let testKey of testKeys) {
          // persist each test's lists
          testResults[testKey].auditLists.forEach((list) => {
            promises.push(AuditLists.persistList({
              testKey,
              list,
              auditRecord,
            }))
          })
        }

        // persist results from custom lists as well
        for (let customList of customLists) {
          // persist each test's lists
          const customListKey = CustomLists.getCustomListKey(customList)
console.log("results from custom list", testResults.customLists[customListKey]);
          testResults.customLists[customListKey].auditLists.forEach((list) => {
            promises.push(AuditLists.persistList({
              testKey: customList.testKey,
              list,
              auditRecord,
              isCustomList: true,
              customList,
            }))
          })
        }

        return Promise.all(promises)
      })
      .then((auditLists) => {
        // auditLists is an array of lists, with populated auditListItems
        auditRecord.auditLists = auditLists

        // mark audits as ready. If they don't get here, they'll be stuck as pending and never see the light of day. Hopefully will end up "ARCHIVED" though, TODO maybe want to run a job every once in a while that turns all pending to archived, but just do it if createdAt is day before or earlier
        return Audits.update({id: auditRecord.id}, {status: "ACTIVE"})
      })
      .then(() => {
        auditRecord.status = "ACTIVE"
        const ret = Object.assign({}, {audit: auditRecord, allReports, reportRequests})

        return resolve(ret)
      })
      .catch((err) => {
//        return reject(err)
//        debugging, so return all reports
        console.error(err);

        console.log("audit failed, so archiving that audit");
        auditRecord && Audits.archiveCascading(auditRecord.id, "failed-audit")

        // just return anyway, but with all the metadata
        return resolve({allReports, err: err.toString(), reportRequests, failedAuditParams: auditRecord || {
          userId: user.id,
          websiteId: params.website.id,
          dateLength: params.dateLength,
        }})
      })
    })
  },

  // for an existing audit, takes the CURRENT settings (not the settings when it was first ran) and runs the audit again.
  // For list items that are found again, leave the original alone
  // for new list items add them
  // for list items that are no longer there, archive them and mark "archiveCause" as "audit-refresh"
  // no options yet
  // TODO not tested, but the basic code is built out how I want it, so it's ready for WHEN we need it
  refreshAudit: ({user, auditId}, options = {}) => {
    return new Promise((resolve, reject) => {
      let website, auditLists, auditListItems, auditRecord, customLists
      let allReports, reportRequests, testResults

      Promise.all([
        Audits.findOne(auditId),
        AuditLists.find({auditId, status: "ACTIVE"}).populate("auditListItems", {status: "ACTIVE"}),
      ])
      .then(([r1, r2]) => {
        auditRecord = r1
        auditLists = r2
        if (!auditRecord) {
          throw {message: "Audit Record not found", status: 404}
        }

        return Websites.findOne({id: auditRecord.websiteId, status: "ACTIVE"}).populate("customLists", {status: "ACTIVE"})
      })
      .then((result) => {
        website = result
        customLists = website.customLists

        if (!auditRecord || !website) {
          throw {message: "Website not found", status: 404}
        }

        let {dateLength, baseDate} = auditRecord

        let params = {website, user, testGroup: "nonGoals", dateLength, baseDate} //TODO might get rid of test group option eventually, and just run all everytime
        params.startDate = auditHelpers.getStartDateFromEndDate(baseDate, dateLength)

        return Audits._getAuditData(params, options)
      })
      .then((result) => {
        allReports = result.allReports
        reportRequests = result.reportRequests
        testResults = result.testResults

        //TODO update audit, lists, and items
        const unmatchedLists = [...auditLists]
        const promises = []

        const testKeys = TEST_GROUPS["nonGoals"] // for now, this is only one that works. TODO
        for (let testKey of testKeys) {
          // check each test's lists for a match and handle accordingly
          for (let refreshedList of testResults[testKey].auditLists) {
            let matchIndex = _.findIndex(unmatchedLists, (listRecord) => listRecord.listKey === refreshedList.listKey)
            let oldList = matchIndex === -1 ? null : unmatchedLists.splice(matchIndex, 1)[0]
            if (oldList) {
              // update matching list with new results.
              promises.push(AuditLists.updateListFromRefresh({
                oldList,
                refreshedList,
                auditRecord,
              }))

            } else {
              // create a new list with all of its items

              promises.push(AuditLists.persistList({
                testKey,
                list: refreshedList,
                auditRecord,
              }))
            }
          }
        }

        // persist results from custom lists as well
        for (let customList of customLists) {
          // persist each test's lists
          const customListKey = CustomLists.getCustomListKey(customList)
          const [refreshedList] = testResults.customLists[customListKey].auditLists // custom lists only ever return one
          let matchIndex = _.findIndex(unmatchedLists, (listRecord) => listRecord.customListId === customList.id)
          let oldList = matchIndex === -1 ? null : unmatchedLists.splice(matchIndex, 1)[0]

          if (oldList) {
            // update matching list with new results.
            promises.push(AuditLists.updateListFromRefresh({
              oldList,
              refreshedList,
              auditRecord,
            }))

          } else {
            // create a new list with all of its items
            promises.push(AuditLists.persistList({
              testKey: customList.testKey,
              list: refreshedList,
              auditRecord,
              isCustomList: true,
              customList,
            }))
          }
        }

        for (let list of unmatchedLists) {
          //TODO archive cascading these lists and their items
          AuditLists.archiveCascading(list.id, "audit-refresh")
        }

        return Promise.all(promises)
      })
      .then((results) => {
        console.log("back from persisting lists")
        // all kinds of results. Very jumbled and messy. easiest thing is to just find all again

        return AuditLists.find({auditId: auditRecord.id, status: "ACTIVE"}).populate("auditListItems", {status: "ACTIVE"})
      })
      .then((refreshedLists) => {
        auditRecord.auditLists = refreshedLists
        const ret = Object.assign({}, {audit: auditRecord, allReports, reportRequests})

        console.log("\nFINISHED\n")
        return resolve(ret)
      })
      .catch((err) => {
//        return reject(err)
//        debugging, so return all reports
//        not archiving this time though! Will mean often a mixed result, with some old and some new...
//        TODO consider keeping old records in memory so could restore at end if there's an error
        console.error(err);
        // just return anyway, but with all the metadata
        return reject({allReports, err: err.toString(), reportRequests, failedAuditParams: auditRecord || {
          userId: user.id,
          websiteId: params.website.id,
          dateLength: params.dateLength,
        }})
      })
    })
  },


  // used whether creating new audit or refreshing audit.
  // Gets all the audit data and test results
  // params: see below for keys that params should have
  // website should have audits and customLists populated on it
  // by the time this func gets called, should already be validated that this should run (authenticated etc)
  // no options yet
  _getAuditData: (params, options = {}) => {
    return new Promise((resolve, reject) => {
      const {user, website, dateLength, testGroup, baseDate = null} = params //baseDate is optional. Mostly will be set dynamically by process below. startDate, at least for now, will always be set by proces below
      const {gaWebPropertyId, gaSiteUrl, gscSiteUrl, gaProfileId, googleAccountId, customLists} = website

      if (moment(params.baseDate).isAfter(moment())) {
        throw new Error("Audit base date (ie end date) must be before the present")
      }

      // set some defaults for the audits
      const gaParams = Object.assign({
        pageSize: 10000, //max 10,000
        viewId: gaProfileId,
        testGroup,
        startDate: params.startDate,
        endDate: moment(params.baseDate).format("YYYY-MM-DD"),
      }, website)
      const gscParams = Object.assign({
        testGroup,
        startDate: params.startDate,
        endDate: moment(params.baseDate).format("YYYY-MM-DD"),
      }, website)

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

        console.log("---------------------");
        console.log("now going over tests");
        const testResults = {}
        for (let testKey of testKeys) {
          // test the data to see what passes/fails for their site for each test we do
          testResults[testKey] = auditHelpers.auditTestFunctions[testKey](gaResults, gscResults, customLists)
        }

        // retrieve results for custom lists as well
        testResults.customLists = {}
        for (let customList of customLists) {
          const customListKey = CustomLists.getCustomListKey(customList)
          testResults.customLists[customListKey] = auditHelpers.auditTestFunctions.customLists(gaResults, gscResults, customList)
        }

        return resolve({
          allReports,
          reportRequests: reportRequestsFinal,
          testResults
        })
      })
      .catch((err) => {
        return reject(err)
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

  // archive the audit and all its lists and items that might have been made
  // don't need to return anything at this point
  archiveCascading: (auditId, archiveReason = "") => {
    if (!auditId) {
      console.error("auditId is required to cascade archive");
      return
    }

    Audits.update({id: auditId}, {status: "ARCHIVED"})
    AuditLists.update({auditId}, {status: "ARCHIVED", archiveReason})
    AuditListItems.update({auditId}, {status: "ARCHIVED", archiveReason})
  }
};

