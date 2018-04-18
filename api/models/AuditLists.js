/**
 * AuditLists.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

const momentTZ = require('moment-timezone')
const auditHelpers = require('../services/analyticsHelpers/auditHelpers')
const _ = require('lodash')

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
    archiveReason: { type: 'string' }, //

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
  persistList: ({testKey, list, auditRecord, isCustomList = false, customList}) => {
    let auditList

    const listParams = {
      testKey,
      listKey: list.listKey,
      startDate: auditHelpers.getStartDateFromEndDate(auditRecord.baseDate, auditRecord.dateLength),
      endDate: auditRecord.baseDate, // eventually each list might have a life of its own, with dynamic start and end times, but for now just based on the baseDate and that's it
      summaryData: list.summaryData,
      userId: auditRecord.userId,
      auditId: auditRecord.id,
      websiteId: auditRecord.websiteId,
      isCustomList,
    }

    if (isCustomList) {
      if (!customList) {throw new Error("customList is required for custom lists!!")}
      const {name, metricFilters, validityMetricFilters, dimensions, orderBys} = customList
      Object.assign(listParams, {name, metricFilters, validityMetricFilters, dimensions, orderBys, customListId: customList.id, listKey: CustomLists.getCustomListKey(customList)})
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
          userId: auditRecord.userId,
          auditId: auditRecord.id,
          auditListId: auditList.id,
          websiteId: auditRecord.websiteId,
        }))
      }

      return Promise.all(promises)
    })
    .then((auditListItems) => {
      auditList.auditListItems = auditListItems
console.log("persisted new list")

      return auditList
    })
    .catch((err) => {
      console.error("Error: failure to persist list");
      throw err
    })
  },


  // after refreshing audit updates list with new results
  // note that oldList is a db record, refreshedlist is not
  updateListFromRefresh: ({oldList, refreshedList, auditRecord, isCustomList = false, customList}) => {

    const unmatchedItems = [...oldList.auditListItems]
    const promises = []

    if (isCustomList) {
      // update list with current customlist params (in case they changed)
      const {name, metricFilters, validityMetricFilters, dimensions, orderBys} = customList
      let listKey = CustomLists.getCustomListKey(customList)

      promises.push(AuditLists.update({id: oldList.id}, {
        name,
        metricFilters,
        validityMetricFilters,
        dimensions,
        orderBys,
        customListId: customList.id,
        listKey,
      }))
    }

    for (let item of refreshedList.auditListItems) {
      let matchIndex = _.findIndex(unmatchedItems, (itemRecord) => itemRecord.dimension === item.dimension)
      let oldItem = matchIndex === -1 ? null : unmatchedItems.splice(matchIndex, 1)
      if (oldItem) {
        if (oldItem.metrics != item.metrics) {
          // update item with new metrics if there's any difference (will often be same, unless the test changed or there was a bug in our code hehe)
          // make sure to not just archiev all the old ones and create new ones for convenience's sake, would remove all record of if finished or not or anything else we persist in future
          promises.push(AuditListItems.update({id: oldItem.id}, {
            metrics: item.metrics,
          }))
        }

      } else {
        // create new item for this list
        promises.push(AuditListItems.create({
          testKey: oldList.testKey,
          listKey: oldList.listKey,
          dimension: item.dimension,
          metrics: item.metrics,
          userId: auditRecord.userId,
          auditId: auditRecord.id,
          auditListId: oldList.id,
          websiteId: auditRecord.websiteId,
        }))
      }
    }

    for (let item of unmatchedItems) {
      // aren't in list anymore, so eliminate
      promises.push(AuditListItems.update({
        status: "ARCHIVED",
        archiveReason: "audit-refresh",
      }))
    }

    return Promise.all(promises)
    .then(() => {
      // all kinds of returned items here, Could extract, but just messy.  don't bother
      console.log("finished updating this list")
      return
    })
    .catch((err) => {
      console.error("Error: failure to update list");
      throw err
    })
  },

  // archive the list and all its  items that might have been made
  // don't need to return anything at this point
  archiveCascading: (listId, archiveReason = "") => {
    if (!listId) {
      console.error("listId is required to cascade archive");
      return
    }

    return Promise.all([
      AuditLists.update({id: listId}, {status: "ARCHIVED", archiveReason}),     AuditListItems.update({auditListId: listId}, {status: "ARCHIVED", archiveReason})
    ])
  }
};

