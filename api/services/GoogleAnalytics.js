const google = require('googleapis');
const analyticsClient = google.analytics("v3")
const analyticsReportingClient = google.analyticsreporting("v4")


const GAHelpers = {
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

        console.log(response.data);
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
      GAHelpers.getAccountSummaries(providerAccount)
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

  generateReportRequests: (filters) => {
    const viewId = filters.profileId
    let dateRanges
    if (filters.startDate) { //if none set, defaults to one week
      dateRanges = [{
        startDate: filters.startDate,
        endDate: filters.endDate || moment().format("YYYY-MM-DD"), //default to present
      }]
    }

    // want to apply this for each report set

    // various filters to be applied to the tempalte, one for each report. Might also get counts for
    const dimensionFilterSets = [
      {
        dimensionFilterClauses: {
          filters: [
            {
              dimensionName: "ga:medium",
              operator: "EXACT",
              expressions: ["(none)"], //gets direct traffic
            },
          ],
        }
      },
      {
        dimensionFilterClauses: {
          filters: [
            {
              dimensionName: "ga:medium",
              operator: "EXACT",
              expressions: ["organic"],
            },
          ],
        }
      },
    ]

    const template = {
      viewId,
      dateRanges,
      metrics: [
        {expression: "ga:pageviews"},
      ], //sessions, users, unique page views, pageviews per session and more are also valid things to use
      dimensions: [ //first dimension needs to be identifier, unique to each article, so that we can sort data later
        {name: "ga:pagePath"}, // could also do pageTitle? or just do both?
        {name: "ga:pageTitle"},
        //{name: "ga:segment"},
        //{name: "ga:fullReferrer"}, //full url of referring webpage, if exists
        //{name: "ga:hasSocialSourceReferral"}, // will extract this to get social referral traffic
      ],
      /*segments: [
        {segmentId: "gaid::-5"}, //organic traffic
        {segmentId: "gaid::-7"}, //direct traffic
        /*{
          dynamicSegment: {
            name: "Traffic from Social Site",
            userSegment: {
              segmentFilters: [{
                simpleSegment: {
                  orFiltersForSegment: [{
                    segmentFilterClauses: [{
                      dimensionFilter:{
                        dimensionName: "ga:hasSocialSourceReferral", //can't use in segment, is banned
                        operator: "EXACT",
                        expressions: [true],
                      }
                    }]
                  }]
                }
              }]
            }
          }
        },*/
      //]
    }



    const reportRequests = dimensionFilterSets.map((dFilterSet) =>
      Object.assign({}, template, dFilterSet)
    )
    //will have to filter this to only get social referral
    const socialReferralDimensions = [...template.dimensions].concat({name: "ga:hasSocialSourceReferral"})
    reportRequests.push(Object.assign({}, template, {dimensions: socialReferralDimensions})) //to get social referrals

    //for now, every report should have total search at teh end for easy parsing and combining
    reportRequests.push(Object.assign({}, template)) //to get totals. Should be same as combined total of the "ga:hasSocialSourceReferral" query, but yeah

    // eventually, will have several helper functions, and each will return reportOrder so that GoogleAnalytics.combineReports can know what to do with each of them
    const reportOrder = ["direct-traffic", "organic-traffic", "social-traffic", "total-traffic"]

    //NOTE: can do max of 5
    return {reportRequests, reportOrder}
  },

  getReport: (providerAccount, filters) => {
    return new Promise((resolve, reject) => {
      let analyticsAccounts, currentAnalyticsAccount
      const oauthClient = Google._setup(providerAccount)
     //all requests should have the same daterange, viewId, segments, samplingLevel, and cohortGroup (these latter ones are a TODO)
      const {reportRequests, reportOrder} = GoogleAnalytics.generateReportRequests(filters)


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
        const combinedReport = GoogleAnalytics.combineReports(reports, reportOrder)
        return resolve(combinedReport)
      })
    })
  },

  //takes multiple reports and combines into single data set to send to browser
  //shared column count is how many dimensions columns each report shares. default is 2 (url and article name), though minimum is 1 (which is requried to ID a given row)
  combineReports: (reports, reportOrder, sharedColumnsCount = 2) => {
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
        metricHeaders.push(Object.assign({}, reportMetricType, {title: `${reportType} ${reportMetricType.name}`}))

        let rows = report.data.rows
        //note: watch out, if no hits, GA won't return data for that webpage
        if (["direct-traffic", "organic-traffic"].includes(reportType)) {
          GoogleAnalytics._combineRows(combinedReport, rows)

        // dimension returns a boolean, so can't use for dimension filters or segments apparently.
        // Instead, find all rows that have "Yes" in this column, and return the metric for that
        } else if (["social-traffic"].includes(reportType)) {
          GoogleAnalytics._combineRows(combinedReport,rows, {
            skipIfFalse: true,
            sharedColumnsCount
          })

        }
      }

      return combinedReport

    } catch (err) {
      console.error("error combining reports: ", err);
    }
  },

  //part of combineReports. Matches a row from one report to a row in the combined report
  _combineRows: (combinedReport, rows, options = {}) => {
    const matchedRows = []

    for (let row of rows) {
      if (options.skipIfFalse && row.dimensions[options.sharedColumnsCount] === "No") {
        //skip over shared columns to find the relevant column that is unique to this report
        continue
      }

      let matchingRow = _.find(combinedReport.data.rows, (combinedReportRow) =>
        //first dimension should be identifier for webpage (currently url)
        combinedReportRow.dimensions[0] === row.dimensions[0]
      )

      if (matchingRow !== -1) {
        console.log(matchingRow);
        matchedRows.push(matchingRow.dimensions[0])
        matchingRow.metrics.push(row.metrics[0])
      } else {
        console.error("row shows up here but not in total? How is that possible? Maybe pagination issue? skipping that row either way; can show that data when the total for that page shows up");
      }
    }

    //if this report missed a row, fill in that column with a value of 0, so every column has a value and we don't mismatch columns and data
    let unmatchedRows = combinedReport.data.rows.filter((row) => !matchedRows.includes(row.dimensions[0]))
    for (let row of unmatchedRows) {
      row.metrics.push({values: ["0"]})
    }
  }
}
module.exports = GAHelpers
