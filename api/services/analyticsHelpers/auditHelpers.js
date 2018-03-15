// for help parsing what we get from their apis
const {AUDIT_TESTS} = require('../../analyticsConstants')

const auditHelpers = {
  auditTestFunctions: {
    pageSpeed: (gaResults = [], gscResults = []) => {
      const relevantReports = findRelevantReports("pageSpeed", gaResults, gscResults)
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
            "ga:avgPageLoadTime": avgLoadTime,
            "ga:pageviews": pageViews,
          })
        }

        return acc
      }, [])

      const slowPageDataSummary = getGADataSummary(["ga:pageviews", "ga:avgPageLoadTime"], relevantGaReport)

      const ret = {
        lists: [
          {
            key: "slowPages",
            items: slowPageRows,
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
      const relevantReports = findRelevantReports("headlineStrength", gaResults, gscResults)
      const [pageSEOData, siteTotalsData] = relevantReports.weakHeadlines.gsc // this test only has one TODO more sturdy way of getting these two reports

      const impressionsIndex = getMetricIndex("impressions", pageSEOData)
      const ctrIndex = getMetricIndex("ctr", pageSEOData)

      const siteTotals = siteTotalsData.rows[0]
      const headlineStrengthDataSummary = getGSCDataSummary(siteTotalsData)

      const siteAvgCTR = parseFloat(siteTotals[ctrIndex])

      const weakHeadlineRows = pageSEOData.rows.reduce((acc, row) => {
        const impressions = row.metrics[0].values[impressionsIndex]
        const ctr = parseFloat(row.metrics[0].values[ctrIndex])

        if (impressions > 500 && ctr < (siteAvgCTR / 2) ) {
          acc.push({
            dimension: row.dimensions[0],
            impressions,
            ctr,
          })
        }

        return acc
      }, [])


      const ret = {
        lists: [
          {
            key: "weakHeadlines",
            items: weakHeadlineRows,
            summaryData: headlineStrengthDataSummary
          }
        ]
      }

      return ret
    },

    browserCompatibility:  (gaResults = [], gscResults = []) => {
      const relevantReports = findRelevantReports("browserCompatibility", gaResults, gscResults)
      const [relevantGaReport] = relevantReports.badBounceRate.ga // this test only has one report for both lists, so for now can reuse TODO make more sturdy method
      const bounceRateIndex = getMetricIndex("ga:bounceRate", relevantGaReport)
      const avgSessionDurationIndex = getMetricIndex("ga:avgSessionDuration", relevantGaReport)
      const usersIndex = getMetricIndex("ga:users", relevantGaReport)

      const browserDataSummary = getGADataSummary("all", relevantGaReport)
      const siteAvgBounceRate = parseFloat(browserDataSummary.totals["ga:bounceRate"])
      const siteAvgSessionDuration = browserDataSummary.totals["ga:avgSessionDuration"]

      const badBounceRateRows = []
      const badSessionDurationRows = []

      relevantGaReport.rows.forEach((row) => {
        const bounceRate = row.metrics[0].values[bounceRateIndex]
        const avgSessionDuration = row.metrics[0].values[avgSessionDurationIndex]
        const users = row.metrics[0].values[usersIndex]

        if (users > 299 &&
          (bounceRate > siteAvgBounceRate + (siteAvgBounceRate * .05))
        ) {
          badBounceRateRows.push({
            dimension: row.dimensions[0],
            "ga:avgSessionDuration": avgSessionDuration,
            "ga:bounceRate": bounceRate,
            "ga:users": users,
          })
        }

        if (users > 299 &&
          (avgSessionDuration < siteAvgSessionDuration - (siteAvgSessionDuration * .05))
        ) {
          badSessionDurationRows.push({
            dimension: row.dimensions[0],
            "ga:avgSessionDuration": avgSessionDuration,
            "ga:bounceRate": bounceRate,
            "ga:users": users,
          })
        }

      })


      const ret = {
        lists: [
          {
            key: "badBounceRate",
            items: badBounceRateRows,
            summaryData: browserDataSummary
          },
          {
            key: "badSessionDuration",
            items: badSessionDurationRows,
            summaryData: browserDataSummary
          }
        ]
      }

      return ret
    },

    deviceCompatibility:  (gaResults = [], gscResults = []) => {
      const relevantReports = findRelevantReports("deviceCompatibility", gaResults, gscResults)
      const [relevantGaReport] = relevantReports.badBounceRate.ga //  this test only has one report for both lists, so for now can reuse TODO make more sturdy method
      const bounceRateIndex = getMetricIndex("ga:bounceRate", relevantGaReport)
      const avgSessionDurationIndex = getMetricIndex("ga:avgSessionDuration", relevantGaReport)
      const usersIndex = getMetricIndex("ga:users", relevantGaReport)

      const deviceDataSummary = getGADataSummary("all", relevantGaReport)
      const siteAvgBounceRate = parseFloat(deviceDataSummary.totals["ga:bounceRate"])
      const siteAvgSessionDuration = deviceDataSummary.totals["ga:avgSessionDuration"]

      const badBounceRateRows = []
      const badSessionDurationRows = []

      relevantGaReport.rows.forEach((row) => {
        const bounceRate = row.metrics[0].values[bounceRateIndex]
        const avgSessionDuration = row.metrics[0].values[avgSessionDurationIndex]
        const users = row.metrics[0].values[usersIndex]

        if (users > 299 &&
          (bounceRate > siteAvgBounceRate + (siteAvgBounceRate * .05))
        ) {
          badBounceRateRows.push({
            dimension: row.dimensions[0],
            "ga:avgSessionDuration": avgSessionDuration,
            "ga:bounceRate": bounceRate,
            "ga:users": users,
          })
        }

        if (users > 299 &&
          (avgSessionDuration < siteAvgSessionDuration - (siteAvgSessionDuration * .05))
        ) {
          badSessionDurationRows.push({
            dimension: row.dimensions[0],
            "ga:avgSessionDuration": avgSessionDuration,
            "ga:bounceRate": bounceRate,
            "ga:users": users,
          })
        }
      })

      const ret = {
        lists: [
          {
            key: "badBounceRate",
            items: badBounceRateRows,
            summaryData: deviceDataSummary
          },
          {
            key: "badSessionDuration",
            items: badSessionDurationRows,
            summaryData: deviceDataSummary
          }
        ]
      }

      return ret
    },


    userInteraction:  (gaResults = [], gscResults = [], goals) => {
      const relevantReports = findRelevantReports("userInteraction", gaResults, gscResults)
      const [relevantGaReport] = relevantReports.badBounceRate.ga //  this test only has one report for both lists, so for now can reuse TODO make more sturdy method
      const bounceRateIndex = getMetricIndex("ga:bounceRate", relevantGaReport)
      const avgSessionDurationIndex = getMetricIndex("ga:avgSessionDuration", relevantGaReport)
      const sessionsIndex = getMetricIndex("ga:sessions", relevantGaReport)

      const dataSummary = getGADataSummary("all", relevantGaReport)
      const siteAvgBounceRate = parseFloat(dataSummary.totals["ga:bounceRate"])
      const siteAvgSessionDuration = dataSummary.totals["ga:avgSessionDuration"]

      const badBounceRateRows = []
      const badSessionDurationRows = []

      relevantGaReport.rows.forEach((row) => {
        const bounceRate = row.metrics[0].values[bounceRateIndex]
        const avgSessionDuration = row.metrics[0].values[avgSessionDurationIndex]
        const sessions = row.metrics[0].values[sessionsIndex]

        if (sessions > 299 &&
          (bounceRate > siteAvgBounceRate + (siteAvgBounceRate * .05))
        ) {
          badBounceRateRows.push({
            dimension: row.dimensions[0],
            "ga:avgSessionDuration": avgSessionDuration,
            "ga:bounceRate": bounceRate,
            "ga:sessions": sessions,
          })
        }

        if (sessions > 299 &&
          (avgSessionDuration < siteAvgSessionDuration - (siteAvgSessionDuration * .05))
        ) {
          badSessionDurationRows.push({
            dimension: row.dimensions[0],
            "ga:avgSessionDuration": avgSessionDuration,
            "ga:bounceRate": bounceRate,
            "ga:sessions": sessions,
          })
        }
      })

      const ret = {
        lists: [
          {
            key: "badBounceRate",
            items: badBounceRateRows,
            summaryData: dataSummary
          },
          {
            key: "badSessionDuration",
            items: badSessionDurationRows,
            summaryData: dataSummary
          }
        ]
      }

      return ret
    },

    // holding off for now
    pageValue:  (gaResults = [], gscResults = [], goals) => {},

    searchPositionToImprove:  (gaResults = [], gscResults = []) => {
      const relevantReports = findRelevantReports("searchPositionToImprove", gaResults, gscResults)
      console.log("relevant reports", relevantReports);
      const [pageSEOData, siteTotalsData] = relevantReports.searchPositionToImprove.gsc

      const positionIndex = getMetricIndex("position", pageSEOData)

      const siteTotals = siteTotalsData.rows[0]
      const dataSummary = getGSCDataSummary(siteTotalsData)

      const siteAvgPosition = parseFloat(siteTotals[positionIndex])

      const canImprovePositionRows = pageSEOData.rows.reduce((acc, row) => {
        const position = parseFloat(row.metrics[0].values[positionIndex])

        if (5 < position && position < 21) {
          acc.push({
            dimension: row.dimensions[0],
            position,
          })
        }

        return acc
      }, [])

      const ret = {
        lists: [
          {
            key: "searchPositionToImprove",
            items: canImprovePositionRows,
            summaryData: dataSummary
          }
        ]
      }

      return ret

    },
    missingPages:  (gaResults = [], gscResults = []) => {
      //return everything
      const {brokenExternal, brokenInternal} = findRelevantReports("missingPages", gaResults, gscResults)
      const [brokenExternalLinks] = brokenExternal.ga
      const [brokenInternalLinks] = brokenInternal.ga

      const brokenExternalRows = brokenExternalLinks.rows.map((row) => (
        {
          dimension: row.dimensions[0],
          "ga:pageTitle": row.dimensions[1],
          "ga:sessions": row.metrics[0].values[0],
        }
      ))
      const externalRowsDataSummary = getGADataSummary("all", brokenExternalLinks)

      // keep same index between internal and exteranl!!! so can reuse index vars

      const brokenInternalRows = brokenInternalLinks.rows.map((row) => (
        {
          dimension: row.dimensions[0],
          "ga:pagePath": row.dimensions[1],
          "ga:sessions": row.metrics[0].values[0],
        }
      ))
      const internalRowsDataSummary = getGADataSummary("all", brokenInternalLinks)

      const ret = {
        lists: [
          {
            key: "brokenExternal",
            items: brokenExternalRows,
            summaryData: externalRowsDataSummary,
          },
          {
            key: "brokenInternal",
            items: brokenInternalRows,
            summaryData: internalRowsDataSummary,
          }
        ]
      }

      return ret
    },
  }
}

/////////////////////////////////////////////////////
//Helpers for auditHelpers
// maps the reports requested for this test to the returned result from ga or gsc
function findRelevantReports(key, gaResults, gscResults) {
  console.log("keuy to find", key);
  const test = AUDIT_TESTS[key]
  const testLists = Object.keys(test.lists)
  const ret = {}
  for (let list of testLists) {
    console.log("list is: ", list);
      console.log("searching for reports with: ", `${test.key}-${list}`);
    // GA
    ret[list] = {}
    ret[list].ga = gaResults.filter((gaReport) =>
      gaReport.requestMetadata.forLists.includes(`${test.key}-${list}`)
    )

    // GSC
    ret[list].gsc = gscResults.filter((gscReport) =>
      gscReport.requestMetadata.forLists.includes(`${test.key}-${list}`)
    )
  }

  return ret
}

function getGADataSummary (metricNames, report) {
  const ret = {}
  const categories = ["maximums", "minimums", "totals"]
console.log("mns", metricNames);
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
