const google = require('googleapis');
const searchConsoleClient = google.webmasters("v3")
const analyticsConstants = require('../analyticsConstants')
const queryHelpers = require('./analyticsHelpers/queryHelpers')
const parsingHelpers = require('./analyticsHelpers/parsingHelpers')

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
  generateQuery: (filters) => {
    const template = {
      startDate: filters.startDate || moment.tz("America/Los Angeles").subtract(1, "month").format("YYYY-MM-DD"), //NOTE: date is calculated in PST time
      endDate: filters.endDate || moment.tz("America/Los Angeles").format("YYYY-MM-DD"), //default to present
      dimensions: filters.dimensions || ["page"],
      //aggregationType: filters.aggregationType || "byPage", //combine all results by canonical url (as opposed to "byProperty" which combines by website, I believe, or "auto" which is either. BUt breaks it when only searching for one page for some reason, and we always use defaults, so yeah
      startRow: (filters.page -1) * filters.pageSize || 0, //pagination
      rowLimit: 5000 //filters.pageSize || 10, //can go up to 5000. Getting all and sorting now
    }

    if (filters.dimensionFilterGroups) {
      //GSC's rough equivalent of GA's dimensionFilterClauses
      template.dimensionFilterGroups = filters.dimensionFilterGroups
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

  getReport: (providerAccount, filters, options) => {
    return new Promise((resolve, reject) => {
      const {dataset} = options
      let analyticsAccounts, currentAnalyticsAccount, requestMetadata
      const oauthClient = Google._setup(providerAccount)

      let {func, defaultMetrics, defaultDimensions, defaultDimensionFilters, defaultAggregationType} = GoogleSearchConsole._getDefaultsFromDataset(dataset)
console.log("func", func);

      //get default metrics and dimensions for a dataset type and then apply the asked for filters on top of it
      filters = Object.assign({
        metrics: defaultMetrics,
        dimensions: defaultDimensions,
        dimensionFilterGroups: defaultDimensionFilters,
        aggregationType: defaultAggregationType,
      }, filters)

      //all requests should have the same daterange, viewId, segments, samplingLevel, and cohortGroup (these latter ones are a TODO)
      const {query} = GoogleSearchConsole[func](filters, dataset)

      const params = {
        auth: oauthClient,
        siteUrl: encodeURIComponent(filters.gscUrl),
        resource: query, //all Google payloads go on this resource thing
      }

      if (options.dataset.includes("contentAudit")) {
        requestMetadata = {forLists: filters.forLists}
      }

      searchConsoleClient.searchanalytics.query(params, (err, response) => {
        if (err) {
          return reject(err)
        }

        //TODO make data same format as GA, probably changing data from GA too though, so that it's easy for frontend to handle. Uniform the data, into columnHeaders, and rows, rows having first dimensions (not "keys"), which is far left column, and then metrics (as GA has it, but just return straight, not needing to get the row.metrics[0].values[0], as GSC has it TODO!!!)
        const ret = GoogleSearchConsole.handleReport({report: response.data, query, requestMetadata, siteUrl: filters.gscUrl})
        //returns an array of rows, one row per page, sorted by clicks in desc
        return resolve(ret)
      })
    })
  },

  //get into consistent format with GA data and other api if we add it
  handleReport: ({report, query, requestMetadata, siteUrl}) => {
    report.columnHeader = {
      dimensions: query.dimensions.map((dimension) => ({
        name: dimension,
        type: "STRING",
      })),
      metrics: [
        {
          name: "clicks",
          title: "Clicks",
          type: "INTEGER",
        },
        {
          name: "impressions",
          title: "Impressions",
          type: "INTEGER",
        },
        {
          name: "ctr",
          title: "Click Through Rate",
          type: "DECIMALED_PERCENT",
        },
        {
          name: "position",
          title: "Position",
          type: "FLOAT",
        },
      ],
    }

    // make consistent with what I'm returning from GA (which is itself modified, but yeah)
    report.rows = report.rows && report.rows.map((row) => {
      const ret = {
        // remove the site base url from the full url to get just the path (so from https://example.com/path => /path)
        dimensions: row.keys ? row.keys.map((key) => key.replace(siteUrl, "/")) : [],
      }
      delete row.keys

      /* ends up like:
       * metrics: [{values: [10, 25, 14, 14]}]
       * one per metric we asked for
       */

      ret.metrics = [{
        values: Object.keys(row).map((key, index) => {
          //since GA returns in this formula, keep it consistent with that
          const rawValue = row[key]
          const valueType = report.columnHeader.metrics[index].type
          const value = parsingHelpers.prettyPrintValue(rawValue, valueType)
          return value
        })
      }]

      return ret
    }) || []

    report.data = {
      rowCount: 999, //TODO seems like it's a good place to max out?? (currently doing 5000 max though haha
    }

    if (requestMetadata) {
      report.requestMetadata = requestMetadata
    }

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
    let func, defaultDimensions, defaultMetrics, defaultDimensionFilters, defaultAggregationType

    func = "generateQuery"
    if (displayType === "table") {
      if (rowsBy === "landingPagePath") {
        defaultDimensions = ["page"]
        defaultAggregationType = "byPage"
      }
      // rows are social networks that referred to the page
      if (rowsBy === "keyword") {
        defaultDimensions = ["query"]
        defaultAggregationType = "byProperty"
      }

      //if (columnSetsArr.length) {}


    } else if (displayType === "chart") {
      //currently only for the line chart, which shows data change over time
      // func = "generateHistogramReportRequest"
      // TODO make it a batch request somehow???? it would be nice to do histogram as well...
      // currently it never goes here though
    } else if (displayType === "contentAudit") {
    }

    return {func, defaultDimensions, defaultMetrics, defaultDimensionFilters, defaultAggregationType}
  },

}
module.exports = GoogleSearchConsole
