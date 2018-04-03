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
};

