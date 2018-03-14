const analyticsConstants = require('../../analyticsConstants')
const {METRICS_SETS, REPORT_TYPES, FILTER_SETS} = analyticsConstants
const chartHelpers = require('./chartHelpers')
//helpers to generate report requests for GA, depending on the type of data we're asking for
module.exports = {
  // generates report requests for single dimension (and hwoever many metrics)
  generateStandardReportRequest: (filters, options = {}) => {
    const viewId = filters.profileId
    let dateRanges
    if (filters.startDate) { //if none set, defaults to one week
      dateRanges = [{
        startDate: filters.startDate,
        endDate: filters.endDate, //. TODO might need to set to PST like I did for GSC, if uses PSt as it does there
      }]
    }
    let dimensionFilterClauses = []
    // can receive sets, if want to define some predefined sets of clauses
    if (filters.dimensionFilterSets) {
      for (let set of filters.dimensionFilterSets) {
        dimensionFilterClauses = dimensionFilterClauses.concat(FILTER_SETS[set])
      }
    }
    if (filters.dimensionFilterClauses) {
      dimensionFilterClauses = dimensionFilterClauses.concat(filters.dimensionFilterClauses)
    }

    // want to apply this for each report set

    // various filters to be applied to the tempalte, one for each report. Might also get counts for

    const pageSize = filters.pageSize || 10
    //page token should be last page's last row index
    const pageToken = String(((filters.page || 1) - 1) * pageSize)

    const metrics = filters.metrics || METRICS_SETS.behavior
    const report = {
      viewId,
      dateRanges,
      metrics,
      dimensions: filters.dimensions || [
        {name: "ga:landingPagePath"},
      ],
      orderBys: [
        filters.orderBy || {
          fieldName: metrics[0].expression, //default to sorting by first metric
          sortOrder: "DESCENDING"
        }
      ],
      pageSize,
    }
    if (pageToken) {
      report.pageToken = pageToken
    }
    if (dimensionFilterClauses.length) {
      report.dimensionFilterClauses = dimensionFilterClauses
    }

    return {
      reportRequests: [report], //only ever returns one, but use plural to stay consistent with other generateGARequest funcs
    }
  },

  // generates report requests to get all the traffic from the different channel types
  // NOT the same as traffic by channel type, which uses channel types as rows
  // note that this uses up the five report max, so would take up a whole request.
  generateChannelTrafficReportRequests: (filters) => {
    const viewId = filters.profileId
    let dateRanges
    if (filters.startDate) { //if none set, defaults to one week
      dateRanges = [{
        startDate: filters.startDate,
        endDate: filters.endDate, //TODO might need to set to PST like I did for GSC, if uses PSt as it does there
      }]
    }

    // want to apply this for each report set

    // various filters to be applied to the tempalte, one for each report. Might also get counts for

    const template = {
      viewId,
      dateRanges,
      metrics: [
        {expression: "ga:pageviews"},
      ], //sessions, users, unique page views, pageviews per session and more are also valid things to use
      dimensions: [ //first dimension needs to be identifier, unique to each article, so that we can sort data later
        {name: "ga:pagePath"}, // could also do pageTitle? or just do both?
        //{name: "ga:pageTitle"}, //gets hundreds of different rows for some pages, eg, root ("/") since had different titles over time
      ],
    }

    //total should always be last, to have for combining reports later
    const reportOrder = ["directTraffic", "organicTraffic", "referralTraffic", "socialTraffic", "totalTraffic"]

    const reportRequest = reportOrder.map((reportType) => {
      //adds the dimensions specific for this report to the shared ones
      const additionalDimensions = REPORT_TYPES[reportType].gaDimensionSets || []
      const reportDimensions = [...template.dimensions].concat(additionalDimensions)
      // addes the dimension filters specific for this report if they exist
      const additionalProperties = REPORT_TYPES[reportType].additionalProperties || {}

      return Object.assign({}, template, {dimensions: reportDimensions}, additionalProperties)
    })

    // eventually, will have several other helper functions, and each will return reportOrder so that GoogleAnalytics.combineReports can know what to do with each of them

    //NOTE: can do max of 5
    return {reportRequests, reportOrder}
  },
  generateHistogramReportRequest: (filters) => {
    const viewId = filters.profileId
    let dateRanges = [{
      startDate: filters.startDate,
      endDate: filters.endDate, //TODO might need to set to PST like I did for GSC, if uses PSt as it does there
    }]

    const histogramData = chartHelpers.getXAxisData(filters)
    const {rangeArray, unit, step} = histogramData
    const histogramBuckets = chartHelpers.getHistogramBuckets(histogramData)

    const report = {
      viewId,
      dateRanges,
      metrics: filters.metrics || [{expression: "ga:pageviews"}, {expression: "ga:uniquePageviews"}], //METRICS_SETS.behavior, note that some won't show well on same chart, eg, %s, times
      dimensions: filters.dimensions || [{
        name: `ga:nth${histogramData.unit}`,
        histogramBuckets,
      }],
      orderBys: [
        {fieldName: `ga:nth${histogramData.unit}`, sortOrder: "ASCENDING", orderType: "HISTOGRAM_BUCKET"}
      ],
      includeEmptyRows: true,//so get a clean timeline. Can trim off start if want too
    }

    let dimensionFilterClauses = []
    // can receive sets, if want to define some predefined sets of clauses
    if (filters.dimensionFilterSets) {
      for (let set of filters.dimensionFilterSets) {
        dimensionFilterClauses = dimensionFilterClauses.concat(FILTER_SETS[set])
      }
    }
    if (filters.dimensionFilterClauses) {
      dimensionFilterClauses = dimensionFilterClauses.concat(filters.dimensionFilterClauses)
    }
    if (dimensionFilterClauses.length) {
      report.dimensionFilterClauses = dimensionFilterClauses
    }
    return {
      reportRequests: [report],
    }
  },

}
