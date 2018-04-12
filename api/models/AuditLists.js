/**
 * AuditLists.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
  tableName: "auditLists",

  attributes: {
    status: { type: 'string', defaultsTo: "ACTIVE" },
    testKey: { type: 'string' }, //key for this test, eg, pageSpeed (note that we have no test records, since unnecessary) (for display purposes only right now)
    listKey: { type: 'string' }, //key for this list, eg, slowPages (some tests have multiple lists)
    startDate: { type: 'date' },
    endDate: { type: 'date' },
    summaryData: { type: 'json' },
    isCustomList: { type: 'boolean' },

    // if custom list, these will have values, to make sure we don't lose track in case they update their customList or something. Otherwise won't
    name: { type: 'string', defaultsTo: ""},
    description: { type: 'string', defaultsTo: ""},
    metricFilters: { type: 'array'},
    // same format as metricFilters, but what we will send to GA for what they will filter by. (like the pageviews for the slow pages test)
    // filters out what is considered invalid data
    validityMetricFilters: { type: 'array'},
    dimensions: { type: 'array'}, //same format as the constants we have in AUDIT_TESTS. Most often just one item
    orderBys: { type: 'array' },//what we send to GA to order the stuff by initially

    //associations
    userId: { model: 'users', required: true },
    auditId: { model: 'audits', required: true },
    websiteId: { model: 'websites', required: true },
    customListId: { model: 'customLists'}, //NOTE the params on teh custom list might not be equal to the params here, hence why persisted here in first place
    auditListItems: {
      collection: 'auditListItems',
      via: 'auditListId'
    },
  },
  autoCreatedAt: true,
  autoUpdatedAt: true,

  // takes a single list from a test and persists the list and all its auditListItems
  persistList: ({testKey, list, auditParams, auditRecord, user, isCustomList = false, customList}) => {
    let auditList

    const listParams = {
      testKey,
      listKey: list.listKey,
      startDate: auditParams.startDate,
      endDate: auditParams.endDate,
      summaryData: list.summaryData,
      userId: user.id,
      auditId: auditRecord.id,
      websiteId: auditParams.website.id,
      isCustomList,
    }

    if (isCustomList) {
      const {name, metricFilters, validityMetricFilters, dimensions, orderBys} = customList
      Object.assign(listParams, {name, metricFilters, validityMetricFilters, dimensions, orderBys, customListId: customList.id})
    }

    return AuditLists.create(listParams)
    .then((newList) => {
      auditList = newList

      const promises = []
      for (let item of list.auditListItems) {
        promises.push(AuditListItems.create({
          testKey,
          listKey: list.listKey,
          dimension: item.dimension,
          metrics: item.metrics,
          userId: user.id,
          auditId: auditRecord.id,
          auditListId: auditList.id,
          websiteId: auditParams.website.id,
        }))
      }

      return Promise.all(promises)
    })
    .then((auditListItems) => {
      auditList.auditListItems = auditListItems

      return auditList
    })
    .catch((err) => {
      console.error("Error: failure to persist list");
      throw err
    })
  },
};

