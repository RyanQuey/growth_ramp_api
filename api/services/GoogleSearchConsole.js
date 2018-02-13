const google = require('googleapis');
const searchConsoleClient = google.webmasters("v3")
const analyticsConstants = require('../analyticsConstants')

const GoogleSearchConsole = {
  // get info for all google sc websites for all Google accounts this user has (not necessarily the same as the GA accounts, I think?)
  getAllGSCAccounts: (googleAccounts) => {
    return new Promise((resolve, reject) => {
      // just manually filtering for now; basically just as fast (can't imagine there will ever be a lot of accounts to filter
      const promises = googleAccounts.map((account) => {
        return GoogleSearchConsole.getSitesList(account)
      }) || []

      //will be array of arrays of analytics accounts, one array of analytics accts / google provider acct
      return resolve(Promise.all(promises))
    })
  },

  // returns all the accounts found that a given Google user account can access
  // might not be necessary, will see
  getSitesList: (providerAccount) => {
    return new Promise((resolve, reject) => {
      const oauthClient = Google._setup(providerAccount)
      const params = {
        auth: oauthClient,
      } //can use other params to paginate

      searchConsoleClient.sites.list(params, (err, response) => {
        if (err) {
          return reject(err)
        }

        console.log(response.data);
        const ret = Object.assign({}, response.data, {providerAccountId: providerAccount.id} )
        return resolve(ret)
      })
    })
  },

  //will eventually predefine some reportTypes for this too
  generateQuery: (filters, reportType) => {
    const template = {
      startDate: filters.startDate || moment.tz("America/Los Angeles").subtract(1, "month").format("YYYY-MM-DD"), //NOTE: date is calculated in PST time
      endDate: filters.endDate || moment.tz("America/Los Angeles").format("YYYY-MM-DD"), //default to present
      dimensions: ["page"],
      aggregationType: "byPage", //combine all results by canonical url (as opposed to "byProperty" which combines by website, I believe, or "auto" which is either,
      startRow: 0, //pagination
      rowLimit: 1000, //can go up to 5000
    }


    //TODO add back in
    /*
    //adds the dimension filters specific for this report to the shared ones
    const dimensionFilterGroups = analyticsConstants.reportTypes[reportType].dimensionFilterGroups || []

    const additionalProperties = analyticsConstants.reportTypes[reportType].additionalProperties || {}
    */
    const query = Object.assign({}, template)

    return {query}
  },

  getReport: (providerAccount, filters) => {
    return new Promise((resolve, reject) => {
      let analyticsAccounts, currentAnalyticsAccount
      const oauthClient = Google._setup(providerAccount)

     //all requests should have the same daterange, viewId, segments, samplingLevel, and cohortGroup (these latter ones are a TODO)
      const {query} = GoogleSearchConsole.generateQuery(filters)

      const params = {
        auth: oauthClient,
        siteUrl: filters.websiteUrl,
      }
      Object.assign(params, query)

      searchConsoleClient.searchanalytics.query(params, (err, response) => {
        if (err) {
          return reject(err)
        }

        //TODO make data same format as GA, probably changing data from GA too though, so that it's easy for frontend to handle. Uniform the data, into columnHeaders, and rows, rows having first dimensions (not "keys"), which is far left column, and then metrics (as GA has it, but just return straight, not needing to get the row.metrics[0].values[0], as GSC has it TODO!!!)
        const ret = GoogleSearchConsole.handleReport(response.data, params)
        //returns an array of rows, one row per page, sorted by clicks in desc
        return resolve(ret)
      })
    })
  },

  //get into consistent format with GA data and other api if we add it
  handleReport: (report, params) => {
    report.columnHeader = {
      dimensions: params.dimensions,
      metrics: [
        {
          name: "clicks",
          title: "clicks",
          type: "INTEGER",
        },
        {
          name: "impressions",
          title: "impressions",
          type: "INTEGER",
        },
        {
          name: "ctr",
          title: "Click Through Rate",
          type: "FLOAT",
        },
        {
          name: "position",
          title: "Click Through Rate",
          type: "FLOAT",
        },
      ],
    }

    report.rows = report.rows.map((row) => {
      const ret = {
        dimensions: row.keys.map((key) => key.replace(params.siteUrl, "")),
      }
      delete row.keys

      ret.metrics = Object.keys(row).map((key) => {
        //since GA returns in this formula, keep it consistent with that
        const value = row[key]
        return {values: [value]}
      })

      return ret
    })

    return report
  },


}
module.exports = GoogleSearchConsole
