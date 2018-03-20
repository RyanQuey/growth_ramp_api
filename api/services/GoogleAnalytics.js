const google = require('googleapis');
const analyticsClient = google.analytics("v3")
const analyticsConstants = require('../analyticsConstants')
const generateGARequest = require('./analyticsHelpers/generateGARequest')
const queryHelpers = require('./analyticsHelpers/queryHelpers')
const parsingHelpers = require('./analyticsHelpers/parsingHelpers')
const analyticsReportingClient = google.analyticsreporting("v4")
const url = require('url')
const {METRICS_SETS, REPORT_TYPES} = analyticsConstants

const GoogleAnalytics = {
  // get info for all google analytics accounts for all Google accounts this user has
  getAllGAAccounts: (googleAccounts) => {
    return new Promise((resolve, reject) => {
      const promises = googleAccounts.map((account) => {
        return GoogleAnalytics.getAccountSummaries(account)
      }) || []

      //will be array of arrays of analytics accounts, one array of analytics accts / google provider acct
      return resolve(Promise.all(promises))
    })
  },

  // returns all the accounts found that a given Google user account can access
  getAccountSummaries: (providerAccount) => {
    return new Promise((resolve, reject) => {
      const oauthClient = Google._setup(providerAccount)
      const params = {
        auth: oauthClient,
      } //can use other params to paginate
      analyticsClient.management.accountSummaries.list(params, (err, response) => {
        if (err) {
          return reject(err)
        }

        //tag our providerAccountId on there for future reference, in case it's needed
        const ret = Object.assign({}, response.data, {providerAccountId: providerAccount.id} )
        return resolve(ret)
      })
    })
  },

  // returns all the accounts found that a given Google user account can access
  getGoals: (providerAccount, accountParams = {}) => {
    return new Promise((resolve, reject) => {
      const oauthClient = Google._setup(providerAccount)

      // default '~all' to get all that this user has access to
      const {accountId = "~all", profileId = "~all", webPropertyId = "~all"} = accountParams

      const params = {
        auth: oauthClient,
        accountId,
        profileId,
        webPropertyId,
      } //can use other params to paginate
      analyticsClient.management.goals.list(params, (err, response) => {
        if (err) {
          return reject(err)
        }

        //tag our providerAccountId on there for future reference, in case it's needed
        const ret = Object.assign({}, response.data, {providerAccountId: providerAccount.id} )
        return resolve(ret)
      })
    })
  },


  // thin wrapper around getAccountSummaries
  // returns details for a single google analytics account that a given google user account can access
  // might want to persist this for all users? Might not be necessary though, just a little faster, and can do more things with that data
  getAccountDetails: (providerAccount, analyticsAccountId) => {
    return new Promise((resolve, reject) => {
      let analyticsAccounts, currentAnalyticsAccount
      GoogleAnalytics.getAccountSummaries(providerAccount)
      .then((response) => {
        analyticsAccounts = response.items
        currentAnalyticsAccount = analyticsAccounts.find((a) => a.id === analyticsAccountId)

        //webProperties (ie, a mobile app, or website) are nested within the account,
        // and profiles (aka views, a given set of data [with particular filters] for its webProperty) nested within that
        return resolve(currentAnalyticsAccount)
      })
      .catch((err) => {console.error(err);})
    })
  },


  //
  // report sets should not have more than 5 in the array
  getReport: (providerAccount, reportSets, options = {}) => {
    return new Promise((resolve, reject) => {
      let analyticsAccounts, currentAnalyticsAccount

      if (!Array.isArray(reportSets)) {
        reportSets = [reportSets]
      }

      const oauthClient = Google._setup(providerAccount)
     //all requests should have the same daterange, viewId, segments, samplingLevel, and cohortGroup (these latter ones are not used yet in GR)

      let {func, defaultMetrics, defaultDimensions, defaultDimensionFilters} = GoogleAnalytics._getDefaultsFromDataset(options.dataset)
      let reportOrder, reportRequests = []
      for (let filters of reportSets) {
        //get default metrics and dimensions for a dataset type and then apply the asked for filters on top of it
        filters = Object.assign({
          metrics: defaultMetrics,
          dimensions: defaultDimensions,
          dimensionFilterClauses: defaultDimensionFilters,
        }, filters)
        //mostly "func" will be generateStandardReportRequest
        let requestData = generateGARequest[func](filters)
        reportOrder = requestData.reportOrder //often undefined

//console.log("request data", requestData.reportRequests);
        reportRequests = reportRequests.concat(requestData.reportRequests)
      }

      if (options.dataset.includes("contentAudit")) {
        reportOrder = reportSets.map((set) => (
          {
            forLists: set.forLists,
          }
        ))
      }

      const params = {
        auth: oauthClient,
        resource: {  // see for how this works: https://github.com/google/google-api-nodejs-client/issues/561
          reportRequests,
        }
      }

      analyticsReportingClient.reports.batchGet(params, (err, response) => {
        if (err) {
          return reject(err)
        }

        const reports = response.data && response.data.reports
        let reportToReturn, ret

        if (options.getChannelTraffic) {
          // this one is weird, so combining reports using report order
          reportToReturn = GoogleAnalytics.combineReports(reports, reportOrder)
          ret = GoogleAnalytics.handleReport(reportToReturn)

        } else if (options.multipleReports) {

          ret = reports && reports.map((report, index) => {
            let requestMetadata = reportOrder[index]
            return GoogleAnalytics.handleReport(report, requestMetadata)
          })

        } else {
          // just requesting a single report
          ret = reports && GoogleAnalytics.handleReport(reports[0])
        }

        return resolve(ret)
      })
    })
  },


  //takes multiple reports and combines into single data set to send to browser
  //shared column count is how many dimensions columns each report shares. default is 1 (url), though minimum is 1 (which is requried to ID a given row)
  combineReports: (reports, reportOrder, sharedColumnsCount = 1) => {
    try {
      //last report should get totals, so good to use for base since it will have one row / article
      const combinedReport = _.cloneDeep(reports[reports.length -1])

      const metricHeaders = combinedReport.columnHeader.metricHeader.metricHeaderEntries

      //only doing one metric type at a time, at least for this helper, so all reports will have the same one.  Combining different dimensions instead
      const reportMetricType = metricHeaders[0] //eg ga:pageviews
      _.set(combinedReport, `columnHeader.metricHeader.metricHeaderEntries.0.title`, `total ${reportMetricType.name}`) //can split("\s") to get column type and metric type later

      //iterate over each report and add to combined report
      //don't need the last one, since it's already handled
      for (let i = 0; i < reports.length -1; i++) {
        let report = reports[i]
        let reportType = reportOrder[i]
        // add column to headers
        metricHeaders.push(Object.assign({}, reportMetricType))// {title: `${reportType} ${reportMetricType.name}`})) do this in frontend

        let rows = report.data.rows
        if (!rows) {
          console.error(`No rows found for this data:`, report.data);
          throw {code: "no-rows-for-profile", status: 400}
        }

        //note: watch out, if no hits, GA won't return data for that webpage
        //TODO dry this up, can use constants better so don't have to do this conditional stuff
        if (["directTraffic", "organicTraffic"].includes(reportType)) {
          GoogleAnalytics._combineRows(combinedReport, rows, reportType)

        // dimension returns a boolean, so can't use for dimension filters or segments apparently.
        // Instead, find all rows that have "Yes" in this column, and return the metric for that
        } else if (["socialTraffic"].includes(reportType)) {
          GoogleAnalytics._combineRows(combinedReport, rows, reportType, {
            skipIfFalseDimensions: [0],
            sharedColumnsCount,
          })

        } else if (["referralTraffic"].includes(reportType)) {
          GoogleAnalytics._combineRows(combinedReport, rows, reportType, {
            skipIfTrueDimensions: [0], //referral traffic does not include social traffic
            sharedColumnsCount,
          })
        }
      }

      return combinedReport

    } catch (err) {
      console.error("error combining reports: ", err);
      //for now, just throw it anyways. Note though that errors will come up
      throw err
    }
  },

  //part of combineReports. Matches a row from one report to a row in the combined report
  _combineRows: (combinedReport, rows, reportType, options = {}) => {
    const matchedRows = []

    for (let row of rows) {
      if (options.skipIfFalseDimensions && options.skipIfFalseDimensions.some(index => row.dimensions[options.sharedColumnsCount + index] === "No")) {
        //skip over shared columns to find the relevant column that is unique to this report
        continue
      }

      if (options.skipIfTrueDimensions && options.skipIfTrueDimensions.map(index => row.dimensions[options.sharedColumnsCount + index] === "Yes")) {
        //skip over shared columns to find the relevant column that is unique to this report
        continue
      }

      // find the row with the right page url
      let matchingRow = _.find(combinedReport.data.rows, (combinedReportRow) =>
        //first dimension should be identifier for webpage (currently url)
        combinedReportRow.dimensions[0] === row.dimensions[0]
      )
//if (row.dimensions[0] === "/") {console.log(reportType, row.dimensions);}
      if (matchingRow !== -1) {
        matchedRows.push(matchingRow.dimensions[0])
        // for each requested daterange, returns an obj in the metrics array. Each metric's value is returned in the metrics[0].values array
        // for now, only doing one date range at a time
        matchingRow.metrics[0].push(row.metrics[0])
      } else {
        console.error("row shows up here but not in total? How is that possible? Maybe pagination issue? skipping that row either way; can show that data when the total for that page shows up");
      }
    }

    //if this report missed a row, fill in that column with a value of 0, so every column has a value and we don't mismatch columns and data
    let unmatchedRows = combinedReport.data.rows.filter((row) => !matchedRows.includes(row.dimensions[0]))
    for (let row of unmatchedRows) {
      row.metrics.push({values: ["0"]})
    }
  },

  // report === {
  //  columnHeader
  //  rows: {
  //    dimensions: [{values: []}]
  //    metrics: []
  //  }
  // }
  //takes either a combinedReport (GR makes) or regular google response and spits out the right format we want
  //goal is to make unified format for all analytics apis
  //might make prettier column names here too TODO
  handleReport: (report, requestMetadata) => {
    //get rid of extra nesting and rename to match format of columnHeader.dimensions
    report.columnHeader.metrics = [...report.columnHeader.metricHeader.metricHeaderEntries]
    delete report.columnHeader.metricHeader
    //make dimensions same format as metric headers
    report.columnHeader.dimensions = report.columnHeader.dimensions.map((dimensionName) => ({
      name: dimensionName,
      type: "STRING",
    }))

    report.rows = [...report.data.rows]
    // if percent or time, add that to the value to display

    const metricHeaders = report.columnHeader.metrics
    for (let i = 0; i < metricHeaders.length; i++) {
      let valueType = metricHeaders[i].type

      // update valuetype for this row if necessary
      for (let row of report.rows) {
        let rawValue = row.metrics[0].values[i]
        row.metrics[0].values[i] = parsingHelpers.prettyPrintValue(rawValue, valueType)
      }

      let rawTotal = report.data.totals[0].values[i]
      report.data.totals[0].values[i] = parsingHelpers.prettyPrintValue(rawTotal, valueType)
    }

    delete report.data.rows //smaller payload === faster

    report.requestMetadata = requestMetadata

    return report
  },

  // takes a dataset and returns some default func and filters
  // dataset should be in format:
  // table-{rowsBy}-{columnsBy}
  // OR
  // chart-{style}-{xAxis}
  _getDefaultsFromDataset: (dataset) => {
    const {datasetParts, displayType, rowsBy, xAxisBy, columnSetsArr} = queryHelpers.parseDataset(dataset)

    // defaults for the different datasets
    let func, defaultDimensions, defaultMetrics, defaultDimensionFilters

    if (displayType === "table") {
      if (rowsBy === "channelGrouping") {
        defaultDimensions = [{name: "ga:channelGrouping"}]
      }

      if (rowsBy === "landingPagePath") {
        defaultDimensions = [{name: "ga:landingPagePath"}]
      }
      // rows are social networks that referred to the page
      if (rowsBy === "source=social") {
        defaultDimensions = [{name: "ga:source"}]
        defaultDimensionFilters = REPORT_TYPES.socialTraffic.gaDimensionFilterClauses
      }
      // rows are ideally non-social networks that referred to the page
      if (rowsBy === "source=referral") {
        defaultDimensions = [{name: "ga:source"}]
        defaultDimensionFilters = REPORT_TYPES.referralTraffic.gaDimensionFilterClauses
      }
      //rows are keywords; data is for SEO
      if (rowsBy === "keyword") {
        defaultDimensions = [{name: "ga:keyword"}]
      }

      if (columnSetsArr.length) {
        defaultMetrics = []
        for (let metricSet of columnSetsArr) {
          defaultMetrics = defaultMetrics.concat(METRICS_SETS[metricSet])
        }
      }

      if (columnSetsArr.includes("channel-traffic")) {
        // my initial table, not using for now
        func = "generateChannelTrafficReportRequests"
      } else {
        func = "generateStandardReportRequest"
      }

    } else if (displayType === "chart") {
      //currently only for the line chart, which shows data change over time
      func = "generateHistogramReportRequest"
    } else if (displayType === "contentAudit") {
      //currently only for the line chart, which shows data change over time
      func = "generateStandardReportRequest"
    }

    return {func, defaultDimensions, defaultMetrics, defaultDimensionFilters}
  },
}

module.exports = GoogleAnalytics
