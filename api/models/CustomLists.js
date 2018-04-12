/**
 * CustomLists.js
 *
 * @description :: users can create lists of their own to show
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
  tableName: "customLists",
  attributes: {
    status: { type: 'string', defaultsTo: "ACTIVE" },
    name: { type: 'string', defaultsTo: ""},
    description: { type: 'string', defaultsTo: ""},
    testKey: { type: 'string', required: true},
    // is what we will do manually after getting results (so we can get totals)
    // array of objs, based rougly off of what GA's api takes
    // "metricFilterClauses": [{
    //   operator: AND or OR (defaults to AND)
    //   "filters": [{
    //     "metricName": "ga:pageviews",
    //     "not": boolean (defaults to false)
    //     "operator": "GREATER_THAN",
    //     "comparisonValue": "2" (so, would be all pages where pageviews > true
    //   }]
    // }]
    metricFilters: { type: 'array', required: true},
    // same format as metricFilters, but what we will send to GA for what they will filter by. (like the pageviews for the slow pages test)
    // filters out what is considered invalid data
    validityMetricFilters: { type: 'array'},
    dimensions: { type: 'array', required: true}, //same format as the constants we have in AUDIT_TESTS. Most often just one item
    orderBys: { type: 'array' },//what we send to GA to order the stuff by initially

    //associations
    userId: { model: 'users', required: true },
    websiteId: { model: 'websites', required: true },
  },
  autoCreatedAt: true,
  autoUpdatedAt: true,

  getCustomListKey: (customList) => (`customList${customList.id}`),

  // takes custom Lists and extracts out what we will need for each api
  // TODO make usable for gsc also
  getAPIReportsFromCustomLists: (customList) => {
    const {metricFilters, validityMetricFilters} = customList
    let metricFilterNames = metricFilters.map((filter) => filter.metricName)
    let requiredMetricNames = validityMetricFilters ? metricFilterNames.concat(validityMetricFilters.map((filter) => filter.metricName)) : metricFilterNames

    let gaReports = [{
      dimensions: customList.dimensions,
      metrics: requiredMetricNames.map((name) => ({expression: name})),
      orderBys: [{
        fieldName: metricFilters[0].metricName,
        sortOrder: metricFilters[0].operator === "LESS_THAN" ? "DESCENDING" : "ASCENDING", // if equal to...shouldn't matter haha
      }],
      forLists: [`${customList.testKey}-${CustomLists.getCustomListKey(customList)}`],
    }]

    let gscReports = [] //TODO not allowing custom lists with GSC data yet

    return {gaReports, gscReports}
  },
};

