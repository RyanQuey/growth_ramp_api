/**
 * Audits.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
  tableName: "auditListItems",

  attributes: {
    status: { type: 'string', defaultsTo: "ACTIVE" },
    listKey: { type: 'string' }, //should be same as its auditList's listKey. Save in both though for now for easier queries (indexing might be better in long run though)
    completed: { type: 'boolean', defaultsTo: false },
    completedAt: { type: 'datetime' },
    metrics: { type: 'json' },
    dimension: { type: 'string' }, //the primary dimension. This is the x-axis on graph

    //associations
    userId: { model: 'users', required: true },
    websiteId: { model: 'websites', required: true },
    auditId: { model: 'audits', required: true },
    auditListId: { model: 'auditLists', required: true },
  },
  autoCreatedAt: true,
  autoUpdatedAt: true,
};

