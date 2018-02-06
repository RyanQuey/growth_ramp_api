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

  getReport: (providerAccount, filters) => {
    return new Promise((resolve, reject) => {
      let analyticsAccounts, currentAnalyticsAccount
      const reportSets = filters.reportSets || [{
        metrics: [{expression: "ga:organicSearches"}],
        //dimensions: [{name: "ga"}]
      }]
      const oauthClient = Google._setup(providerAccount)
     //all requests should have the same daterange, viewId, segments, samplingLevel, and cohortGroup (these latter ones are a TODO)
      const reqTemplate = {
        viewId: filters.profileId,
      }
      //TODO haven't tested
      if (filters.startDate) {
        reqTempate.dateRanges = [{startDate: filter.startDate, endDate: filter.endDate || moment(filter.startDate).add(1, "week").format("YYYY-MM-DD")}]
      }

      //NOTE: can do max of 5
      const reportRequests = reportSets.map((set) =>
        Object.assign({}, reqTemplate, set)
      )

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
