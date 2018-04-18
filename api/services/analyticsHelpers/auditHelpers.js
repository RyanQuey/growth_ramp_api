// for help parsing what we get from their apis
const {AUDIT_TESTS} = require('../../analyticsConstants')
const {nonPrettyValue} = require('./parsingHelpers')

//TODO would be nice to DRY this up eventually, once it becomes clear what exactly we will do with these
//Something that would take array of metric filters and return pages that make it through those filters, and takes what reports it would need etc and just spit it all out
//might take a few different funcs for different types of audits
//will become more important as we make more audits
//can base off of what we do with the custom lists
const auditHelpers = {
  auditTestFunctions: {
    pageSpeed: (gaResults = [], gscResults = []) => {
      const relevantReports = findRelevantReports({key: "pageSpeed", gaResults, gscResults})
      const [relevantGaReport] = relevantReports.slowPages.ga // this test only has one
      const avgPageLoadTimeIndex = getMetricIndex("ga:avgPageLoadTime", relevantGaReport)
      const pageViewsIndex = getMetricIndex("ga:pageviews", relevantGaReport)

      const slowPageRows = relevantGaReport.rows.reduce((acc, row) => {
        const avgLoadTime = row.metrics[0].values[avgPageLoadTimeIndex]
        const pageViews = row.metrics[0].values[pageViewsIndex]

        // only return slow pages matches with enough views
        // TODO consider just filtering in GA. But, might be harder to reuse the same report requests? Also, would throw off the totals we get back, since would only get average, for example, load time for pages in site whose page views are more than 500. Which might be preferrable, but might not be
        if (pageViews > 500 && avgLoadTime > 4.9) {
          acc.push({
            dimension: row.dimensions[0],
            metrics: {
              "ga:avgPageLoadTime": avgLoadTime,
              "ga:pageviews": pageViews,
            },
          })
        }

        return acc
      }, [])

      const slowPageDataSummary = getGADataSummary(["ga:pageviews", "ga:avgPageLoadTime"], relevantGaReport)

      const ret = {
        auditLists: [
          {
            listKey: "slowPages",
            auditListItems: slowPageRows,
            summaryData: slowPageDataSummary
          }
        ]
      }

      return ret
    },

  /*
    wellBalancedPortfolio: { //not using yet
    },

    keywordTargets: {//not using yet
    },
  */
    headlineStrength: (gaResults = [], gscResults = []) => {
      const relevantReports = findRelevantReports({key: "headlineStrength", gaResults, gscResults})
      const [pageSEOData, siteTotalsData] = relevantReports.weakHeadlines.gsc // this test only has one TODO more sturdy way of getting these two reports

      const impressionsIndex = getMetricIndex("impressions", pageSEOData)
      const ctrIndex = getMetricIndex("ctr", pageSEOData)

      const headlineStrengthDataSummary = getGSCDataSummary(siteTotalsData)

      const siteAvgCTR = parseFloat(headlineStrengthDataSummary.totals.ctr)

      const weakHeadlineRows = pageSEOData.rows.reduce((acc, row) => {
        const impressions = row.metrics[0].values[impressionsIndex]
        const ctr = parseFloat(row.metrics[0].values[ctrIndex])
        if (impressions > 500 && ctr < (siteAvgCTR / 2) ) {
          acc.push({
            dimension: row.dimensions[0],
            metrics: {
              impressions,
              ctr,
            },
          })
        }

        return acc
      }, [])


      const ret = {
        auditLists: [
          {
            listKey: "weakHeadlines",
            auditListItems: weakHeadlineRows,
            summaryData: headlineStrengthDataSummary
          }
        ]
      }

      return ret
    },

    browserCompatibility:  (gaResults = [], gscResults = []) => {
      const relevantReports = findRelevantReports({key: "browserCompatibility", gaResults, gscResults})
      const [relevantGaReport] = relevantReports.badBounceRate.ga // this test only has one report for both auditLists, so for now can reuse TODO make more sturdy method
      const bounceRateIndex = getMetricIndex("ga:bounceRate", relevantGaReport)
      const avgSessionDurationIndex = getMetricIndex("ga:avgSessionDuration", relevantGaReport)
      const usersIndex = getMetricIndex("ga:users", relevantGaReport)

      const browserDataSummary = getGADataSummary("all", relevantGaReport)
      const siteAvgBounceRate = nonPrettyValue(browserDataSummary.totals["ga:bounceRate"], "PERCENT")
      const siteAvgSessionDuration = nonPrettyValue(browserDataSummary.totals["ga:avgSessionDuration"], "TIME")

      const badBounceRateRows = []
      const badSessionDurationRows = []

      relevantGaReport.rows.forEach((row) => {
        const bounceRate = row.metrics[0].values[bounceRateIndex]
        const rawBounceRate = nonPrettyValue(bounceRate, "PERCENT")
        const avgSessionDuration = row.metrics[0].values[avgSessionDurationIndex]
        const rawAvgSessionDuration = nonPrettyValue(avgSessionDuration, "TIME")
        const users = row.metrics[0].values[usersIndex]

        if (users > 299 &&
          (rawBounceRate > siteAvgBounceRate + (siteAvgBounceRate * .05))
        ) {
          badBounceRateRows.push({
            dimension: row.dimensions[0],
            metrics: {
              "ga:avgSessionDuration": avgSessionDuration,
              "ga:bounceRate": bounceRate,
              "ga:users": users,
            },
          })
        }

        if (users > 299 &&
          (rawAvgSessionDuration < siteAvgSessionDuration - (siteAvgSessionDuration * .05))
        ) {
          badSessionDurationRows.push({
            dimension: row.dimensions[0],
            metrics: {
              "ga:avgSessionDuration": avgSessionDuration,
              "ga:bounceRate": bounceRate,
              "ga:users": users,
            },
          })
        }

      })


      const ret = {
        auditLists: [
          {
            listKey: "badBounceRate",
            auditListItems: badBounceRateRows,
            summaryData: browserDataSummary
          },
          {
            listKey: "badSessionDuration",
            auditListItems: badSessionDurationRows,
            summaryData: browserDataSummary
          }
        ]
      }

      return ret
    },

    deviceCompatibility:  (gaResults = [], gscResults = []) => {
      const relevantReports = findRelevantReports({key: "deviceCompatibility", gaResults, gscResults})
      const [relevantGaReport] = relevantReports.badBounceRate.ga //  this test only has one report for both auditLists, so for now can reuse TODO make more sturdy method
      const bounceRateIndex = getMetricIndex("ga:bounceRate", relevantGaReport)
      const avgSessionDurationIndex = getMetricIndex("ga:avgSessionDuration", relevantGaReport)
      const usersIndex = getMetricIndex("ga:users", relevantGaReport)

      const deviceDataSummary = getGADataSummary("all", relevantGaReport)
      const siteAvgBounceRate = nonPrettyValue(deviceDataSummary.totals["ga:bounceRate"], "PERCENT")
      const siteAvgSessionDuration = nonPrettyValue(deviceDataSummary.totals["ga:avgSessionDuration"], "TIME")

      const badBounceRateRows = []
      const badSessionDurationRows = []

      relevantGaReport.rows.forEach((row) => {
        const bounceRate = row.metrics[0].values[bounceRateIndex]
        const rawBounceRate = nonPrettyValue(bounceRate, "PERCENT")
        const avgSessionDuration = row.metrics[0].values[avgSessionDurationIndex]
        const rawAvgSessionDuration = nonPrettyValue(avgSessionDuration, "TIME")
        const users = row.metrics[0].values[usersIndex]

        if (users > 299 &&
          (rawBounceRate > siteAvgBounceRate + (siteAvgBounceRate * .05))
        ) {
          badBounceRateRows.push({
            dimension: row.dimensions[0],
            metrics: {
              "ga:avgSessionDuration": avgSessionDuration,
              "ga:bounceRate": bounceRate,
              "ga:users": users,
            },
          })
        }

        if (users > 299 &&
          (rawAvgSessionDuration < siteAvgSessionDuration - (siteAvgSessionDuration * .05))
        ) {
          badSessionDurationRows.push({
            dimension: row.dimensions[0],
            metrics: {
              "ga:avgSessionDuration": avgSessionDuration,
              "ga:bounceRate": bounceRate,
              "ga:users": users,
            },
          })
        }
      })

      const ret = {
        auditLists: [
          {
            listKey: "badBounceRate",
            auditListItems: badBounceRateRows,
            summaryData: deviceDataSummary
          },
          {
            listKey: "badSessionDuration",
            auditListItems: badSessionDurationRows,
            summaryData: deviceDataSummary
          }
        ]
      }

      return ret
    },


    userInteraction:  (gaResults = [], gscResults = [], goals) => {
      const relevantReports = findRelevantReports({key: "userInteraction", gaResults, gscResults})
      const [relevantGaReport] = relevantReports.badBounceRate.ga //  this test only has one report for both auditLists, so for now can reuse TODO make more sturdy method
      const bounceRateIndex = getMetricIndex("ga:bounceRate", relevantGaReport)
      const avgSessionDurationIndex = getMetricIndex("ga:avgSessionDuration", relevantGaReport)
      const sessionsIndex = getMetricIndex("ga:sessions", relevantGaReport)

      const dataSummary = getGADataSummary("all", relevantGaReport)
      const siteAvgBounceRate = dataSummary.totals["ga:bounceRate"]
      const siteAvgSessionDuration = nonPrettyValue(dataSummary.totals["ga:avgSessionDuration"], "TIME")

      const badBounceRateRows = []
      const badSessionDurationRows = []

      relevantGaReport.rows.forEach((row) => {
        const bounceRate = row.metrics[0].values[bounceRateIndex]
        const rawBounceRate = nonPrettyValue(bounceRate, "PERCENT")
        const avgSessionDuration = row.metrics[0].values[avgSessionDurationIndex]
        const rawAvgSessionDuration = nonPrettyValue(avgSessionDuration, "TIME")
        const sessions = row.metrics[0].values[sessionsIndex]

        if (sessions > 299 &&
          (rawBounceRate > siteAvgBounceRate + (siteAvgBounceRate * .05))
        ) {
          badBounceRateRows.push({
            dimension: row.dimensions[0],
            metrics: {
              "ga:avgSessionDuration": avgSessionDuration,
              "ga:bounceRate": bounceRate,
              "ga:sessions": sessions,
            },
          })
        }

        if (sessions > 299 &&
          (rawAvgSessionDuration < siteAvgSessionDuration - (siteAvgSessionDuration * .05))
        ) {
          badSessionDurationRows.push({
            dimension: row.dimensions[0],
            metrics: {
              "ga:avgSessionDuration": avgSessionDuration,
              "ga:bounceRate": bounceRate,
              "ga:sessions": sessions,
            },
          })
        }
      })

      const ret = {
        auditLists: [
          {
            listKey: "badBounceRate",
            auditListItems: badBounceRateRows,
            summaryData: dataSummary
          },
          {
            listKey: "badSessionDuration",
            auditListItems: badSessionDurationRows,
            summaryData: dataSummary
          }
        ]
      }

      return ret
    },

    // holding off for now
    pageValue:  (gaResults = [], gscResults = [], goals) => {},

    searchPositionToImprove:  (gaResults = [], gscResults = []) => {
      const relevantReports = findRelevantReports({key: "searchPositionToImprove", gaResults, gscResults})
      console.log("relevant reports", relevantReports);
      const [pageSEOData, siteTotalsData] = relevantReports.searchPositionToImprove.gsc

      const positionIndex = getMetricIndex("position", pageSEOData)

      const siteTotals = siteTotalsData.rows[0]
      const dataSummary = getGSCDataSummary(siteTotalsData)

      const siteAvgPosition = parseFloat(siteTotals.position)

      const canImprovePositionRows = pageSEOData.rows.reduce((acc, row) => {
        const position = parseFloat(row.metrics[0].values[positionIndex])

        if (5 < position && position < 21) {
          acc.push({
            dimension: row.dimensions[0],
            metrics: {
              position,
            },
          })
        }

        return acc
      }, [])

      const ret = {
        auditLists: [
          {
            listKey: "searchPositionToImprove",
            auditListItems: canImprovePositionRows,
            summaryData: dataSummary
          }
        ]
      }

      return ret

    },
    missingPages:  (gaResults = [], gscResults = []) => {
      //return everything
      const {brokenExternal, brokenInternal} = findRelevantReports({key: "missingPages", gaResults, gscResults})
      const [brokenExternalLinks] = brokenExternal.ga
      const [brokenInternalLinks] = brokenInternal.ga

      const brokenExternalRows = brokenExternalLinks.rows.map((row) => (
        {
          dimension: row.dimensions[0],
          metrics: {
            "ga:pageTitle": row.dimensions[1],
            "ga:sessions": row.metrics[0].values[0],
          },
        }
      ))
      const externalRowsDataSummary = getGADataSummary("all", brokenExternalLinks)

      // keep same index between internal and exteranl!!! so can reuse index vars

      const brokenInternalRows = brokenInternalLinks.rows.map((row) => (
        {
          dimension: row.dimensions[0],
          metrics: {
            "ga:pagePath": row.dimensions[1],
            "ga:sessions": row.metrics[0].values[0],
          },
        }
      ))
      const internalRowsDataSummary = getGADataSummary("all", brokenInternalLinks)

      const ret = {
        auditLists: [
          {
            listKey: "brokenExternal",
            auditListItems: brokenExternalRows,
            summaryData: externalRowsDataSummary,
          },
          {
            listKey: "brokenInternal",
            auditListItems: brokenInternalRows,
            summaryData: internalRowsDataSummary,
          }
        ]
      }

      return ret
    },

    // for use with custom lists TODO extract out logic to reuse with other tests
    // first need to make applicable to gsc too though
    customLists:  (gaResults = [], gscResults = [], customList) => {
      const relevantReports = findRelevantReports({customList, gaResults, gscResults, isCustomList: true})
      const [relevantGaReport] = relevantReports.ga // only ga for now

      const dataSummary = getGADataSummary("all", relevantGaReport)

      const matchingRows = []

      const metricFilters = customList.metricFilters.map((f) => Object.assign(f, {index: getMetricIndex(f.metricName, relevantGaReport)}))

        /* metrics: {
            "ga:avgSessionDuration": avgSessionDuration,
            "ga:bounceRate": bounceRate,
            "ga:sessions": sessions,
          },
        */
      let metrics = {}
      relevantGaReport.rows.forEach((row) => {
        // if some metric filters makes it fail, skip
        if (metricFilters.some((filter) => {
          const metricValue = row.metrics[0].values[filter.index]
          let valueType = relevantGaReport.columnHeader.metrics[filter.index].type

          let rawValue = nonPrettyValue(metricValue, valueType)

          metrics[filter.metricName] = metricValue //in case it passes

          if (filter.operator === "GREATER_THAN") {
            return rawValue <= filter.comparisonValue
          } else if (customList.operator === "LESS_THAN") {
            return rawValue >= filter.comparisonValue
          } else if (customList.operator === "EQUAL") {
            return rawValue != filter.comparisonValue
          }
        })) {
          return //this is skipping

        } else {
          // passed test!
          matchingRows.push({
            dimension: row.dimensions[0],
            metrics
          })
        }
      })

      const ret = {
        auditLists: [
          {
            listKey: CustomLists.getCustomListKey(customList),
            auditListItems: matchingRows,
            summaryData: dataSummary,
          }
        ]
      }

      return ret
    },
  },

  // takes audit start date and dateLength and dynamically gets endDate
  getEndDateFromStartDate: (startDate, dateLength) => {
    let endDate
    // there are previous audits, audit
    if (dateLength === "month") {
      endDate = moment(startDate).add(1, "month").format("YYYY-MM-DD") //NOTE: date is calculated in PST time for GA. Also, if used for basedate, basedate will be persisted with time as well, due to db column being a date type
    } else if (dateLength === "year") {
      endDate = moment(startDate).add(1, "year").format("YYYY-MM-DD") //NOTE: date is calculated in PST time
    } else if (dateLength === "quarter") {
      endDate = moment(startDate).add(3, "months").format("YYYY-MM-DD") //NOTE: date is calculated in PST time
    }

    return endDate
  },

  // takes audit end date and dateLength and dynamically gets startDate
  getStartDateFromEndDate: (endDate, dateLength) => {
    let startDate
    // there are previous audits, audit
    if (dateLength === "month") {
      startDate = moment(endDate).subtract(1, "month").format("YYYY-MM-DD") //NOTE: date is calculated in PST time
    } else if (dateLength === "year") {
      startDate = moment(endDate).subtract(1, "year").format("YYYY-MM-DD") //NOTE: date is calculated in PST time
    } else if (dateLength === "quarter") {
      startDate = moment(endDate).subtract(3, "months").format("YYYY-MM-DD") //NOTE: date is calculated in PST time
    }

    return startDate
  },

  // latest audit by baseDate
  getLatestAudit: (auditsArr, options = {}) => {
    if (options.filterFunc) {
      auditsArr = auditsArr.filter(options.filterFunc)
    }

    // default to the last one
    let latestAudit = auditsArr[auditsArr.length -1]

    for (let audit of auditsArr) {
      // note: For audits made in test env that don't have baseDate, this will always return false for records made before we added the baseDate.
      if (moment(audit.baseDate).isAfter(latestAudit.baseDate)) {
        latestAudit = audit
      }
    }

    return latestAudit
  },

  // mostly for passing in another audit's baseDate
  getLatestAuditBefore: (auditsArr, {endDate, websiteId}) => {
    const filterFunc = (audit) => (audit.websiteId === websiteId && moment(audit.baseDate).isBefore(endDate))
    let latestAudit = analyticsHelpers.getLatestAudit(auditsArr, {filterFunc})
    return latestAudit
  },
}

/////////////////////////////////////////////////////
//Helpers for auditHelpers
// maps the reports requested for this test to the returned result from ga or gsc
function findRelevantReports({key, gaResults, gscResults, isCustomList, customList}) {
  const ret = {}
  if (isCustomList) {
    let fullKey = `${customList.testKey}-${CustomLists.getCustomListKey(customList)}`
    ret.ga = gaResults.filter((gaReport) =>
      gaReport.requestMetadata.forLists.includes(fullKey)
    )

    // GSC
    ret.gsc = gscResults.filter((gscReport) =>
      gscReport.requestMetadata.forLists.includes(fullKey)
    )

  } else {
    console.log("keuy to find", key);
    const test = AUDIT_TESTS[key]
    const testLists = Object.keys(test.auditLists)
    for (let list of testLists) {
      let fullKey = `${test.key}-${list}`
      console.log("searching for reports with: ", fullKey);
      // GA
      ret[list] = {}
      ret[list].ga = gaResults.filter((gaReport) =>
        gaReport.requestMetadata.forLists.includes(fullKey)
      )

      // GSC
      ret[list].gsc = gscResults.filter((gscReport) =>
        gscReport.requestMetadata.forLists.includes(fullKey)
      )
    }
  }

  return ret
}

function getGADataSummary (metricNames, report) {
  const ret = {}
  const categories = ["maximums", "minimums", "totals"]
  categories.forEach((category) => {
    ret[category] = {}

    if (metricNames === "all") {
      for (let metric of report.columnHeader.metrics) {
        let name = metric.name
        const metricIndex = getMetricIndex(name, report)
        ret[category][name] = Helpers.safeDataPath(report, `data.${category}.0.values.${metricIndex}`, 0)
      }
    } else {
      for (let name of metricNames) {
        const metricIndex = getMetricIndex(name, report)
        ret[category][name] = Helpers.safeDataPath(report, `data.${category}.0.values.${metricIndex}`, 0)
      }
    }
  })

  return ret
}

function getGSCDataSummary (report) {
  const totals = {}
  report.columnHeader.metrics.forEach((metric, index) => {
    totals[metric.name] = report.rows[0].metrics[0].values[index]
  })

  return {totals}
}

function getMetricIndex (metricName, report) {
  return report.columnHeader.metrics.findIndex((metricHeader) => metricHeader.name === metricName)
}

module.exports = auditHelpers
