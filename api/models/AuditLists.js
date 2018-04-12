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

    //associations
    userId: { model: 'users', required: true },
    auditId: { model: 'audits', required: true },
    websiteId: { model: 'websites', required: true },
    auditListItems: {
      collection: 'auditListItems',
      via: 'auditListId'
    },
  },
  autoCreatedAt: true,
  autoUpdatedAt: true,

  // takes a single list from a test and persists the list and all its auditListItems
  persistList: ({testKey, list, auditParams, auditRecord, user}) => {
    let auditList

    return AuditLists.create({
      testKey,
      listKey: list.listKey,
      startDate: auditParams.startDate,
      endDate: auditParams.endDate,
      summaryData: list.summaryData,
      userId: user.id,
      auditId: auditRecord.id,
      websiteId: auditParams.website.id,
    })
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

