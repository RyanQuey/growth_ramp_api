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
      } //can use to paginate
      analyticsClient.management.accountSummaries.list(params, (err, response) => {
        if (err) {
          return reject(err)
        }

        console.log(response.data);
        //to get the accounts themselves, do response.items
        return resolve(response.data)
      })
    })
  },

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
  }
}
module.exports = GAHelpers
