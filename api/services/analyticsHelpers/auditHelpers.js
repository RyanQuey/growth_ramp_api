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

      const slowPageDataSummary = getDataSummary(["ga:pageviews", "ga:avgPageLoadTime"], relevantGaReport)

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
    headlineStrength: () => {},

    browserCompatibility: () => {},

    deviceCompatibility: () => {},
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
      const reportDimensionNames = report.columnHeader.dimensions.map((d) => d.name)
      const reportMetricNames = report.columnHeader.metrics.map((m) => m.name)

      return _.isEqual(testDimensionNames, reportDimensionNames) && testMetricNames.every((metricName) => reportMetricNames.includes(metricName))
    })
  })

  const relevantGscReports = test.gscReports && test.gscReports.map((r) => r) //TODO
  return {relevantGaReports, relevantGscReports}
}

function getDataSummary (metricNames, report) {
  const ret = {}
  const categories = ["maximums", "minimums", "totals"]

  categories.forEach((category) => {
    ret[category] = {}
    for (let name of metricNames) {
      const metricIndex = getMetricIndex(name, report)
      ret[category][name] = report.data[category][0].values[metricIndex]
    }
  })

  return ret
}

function getMetricIndex (metricName, report) {
  report.columnHeader.metrics.findIndex((metricHeader) => metricHeader.name === metricName)
}

module.exports = auditHelpers
