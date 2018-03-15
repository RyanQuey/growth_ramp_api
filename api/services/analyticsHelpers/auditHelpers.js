// for help parsing what we get from their apis
const {AUDIT_TESTS} = require('../../analyticsConstants')

const auditHelpers = {
  auditTestFunctions: {
    pageSpeed: (gaResults = [], gscResults = []) => {
      const {relevantGaReports} = findRelevantReports("pageSpeed", gaResults, gscResults)
      const [relevantGaReport] = relevantGaReports // this test only has one
      console.log("relevant report:", relevantGaReport);
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
      const {relevantGscReports} = findRelevantReports("headlineStrength", gaResults, gscResults)
      const [pageSEOData, siteTotalsData] = relevantGscReports // this test only has one

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
            key: "headlineStrength",
            items: weakHeadlineRows,
            summaryData: headlineStrengthDataSummary
          }
        ]
      }

      return ret
    },

    browserCompatibility: () => {},

    deviceCompatibility: () => {},

    userInteraction: () => {},

    pageValue: () => {},

    searchPositionToImprove: () => {},
  }
}

// maps the reports requested for this test to the returned result from ga or gsc
function findRelevantReports(key, gaResults, gscResults) {
  const test = AUDIT_TESTS[key]
  const relevantGaReports = test.gaReports && test.gaReports.map((r) => {
    const testDimensionNames = r.dimensions.map((d) => d.name)
    console.log("test dimensions", testDimensionNames);
    const testMetricNames = r.metrics.map((d) => d.expression)

    return _.find(gaResults, (report) => {
      // same dimensions exactly and includes every metric we need for this test
      // TODO if ever filter, will need to use that here too to find the right one
      const reportDimensionNames = report.columnHeader.dimensions.map((d) => d.name)
      const reportMetricNames = report.columnHeader.metrics.map((m) => m.name)

      return _.isEqual(testDimensionNames, reportDimensionNames) && testMetricNames.every((metricName) => reportMetricNames.includes(metricName))
    })
  })

  const relevantGscReports = test.gscReports && test.gscReports.map((r) =>{
    const testDimensionNames = r.dimensions
    return _.find(gscResults, (report) => {
      // same dimensions exactly
      const reportDimensionNames = report.columnHeader.dimensions.map((d) => d.name)

      return (
        testDimensionNames.length === 0 && report.columnHeader.dimensions.length === 0 ||
        _.isEqual(testDimensionNames, reportDimensionNames)
      )
    })
  })

  return {relevantGaReports, relevantGscReports}
}

function getGADataSummary (metricNames, report) {
  const ret = {}
  const categories = ["maximums", "minimums", "totals"]
console.log("mns", metricNames);
  categories.forEach((category) => {
    ret[category] = {}

    for (let name of metricNames) {
console.log("name", name);
      const metricIndex = getMetricIndex(name, report)
console.log("metric index", metricIndex);
      ret[category][name] = report.data[category][0].values[metricIndex]
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
