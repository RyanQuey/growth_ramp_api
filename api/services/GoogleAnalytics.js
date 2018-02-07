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

  generateReportRequest: (filters) => {
    const viewId = filters.profileId
    let dateRanges
    if (filters.startDate) {
      dateRanges = [{startDate: filter.startDate, endDate: filter.endDate || moment(filter.startDate).add(1, "week").format("YYYY-MM-DD")}]
    }

    // want to apply this for each report set

    // various filters to be applied to the tempalte. Might also get counts for
    /*
    const filters = [
      {
        dimensionFilterClauses: [
          {
            dimensionName: "ga:hasSocialSourceReferral",
            operator: "EXACT",
            expressions: [true], //to get social referrals
          },
        ],
      },
      {
        dimensionFilterClauses: [
          {
            dimensionName: "ga:medium",
            operator: "EXACT",
            expressions: ["(direct)"],
          },
        ],
      },
      {
        dimensionFilterClauses: [
          {
            dimensionName: "ga:medium",
            operator: "EXACT",
            expressions: ["organic"],
          },
        ],
      },
      {
        dimensionFilterClauses: [], //this would be to get the total
      },
    ]
    */

    const reportRequest = {
      viewId,
      dateRanges,
      metrics: [
        {expression: "ga:pageviews"},
      ], //sessions, users, unique page views, pageviews per session and more are also valid things to default to
      dimensions: [
        {name: "ga:pagePath"}, // could also do pageTitle? or just do both?
        {name: "ga:pageTitle"},
        {name: "ga:segment"},
        {name: "ga:fullReferrer"}, //full url of referring webpage, if exists
        {name: "ga:hasSocialSourceReferral"}, // will extract this to get social referral traffic
      ],
      segments: [
        {segmentId: "gaid::-5"}, //organic traffic
        {segmentId: "gaid::-7"}, //direct traffic
        {segmentId: "gaid::-7"}, //direct traffic
        {segmentId: "gaid::-1"}, //should be total
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
      ]
    }

    return reportRequest
  },

  getReport: (providerAccount, filters) => {
    return new Promise((resolve, reject) => {
      let analyticsAccounts, currentAnalyticsAccount
      const oauthClient = Google._setup(providerAccount)
     //all requests should have the same daterange, viewId, segments, samplingLevel, and cohortGroup (these latter ones are a TODO)
      const reportRequest = GoogleAnalytics.generateReportRequest(filters)

      //NOTE: can do max of 5
      const reportRequests = [reportRequest]

      const params = {
        auth: oauthClient,
        resource: {  // see for how this works: https://github.com/google/google-api-nodejs-client/issues/561
          reportRequests,
        }
      }
console.log("\n\nparams", params);
      analyticsReportingClient.reports.batchGet(params, (err, response) => {
        if (err) {
          return reject(err)
        }

console.log(response.data);

        return resolve(response.data)
      })
    })

  },
}
module.exports = GAHelpers
