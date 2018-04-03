/**
 * websites.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    status: { type: 'string', defaultsTo: "ACTIVE" },
    name: { type: 'string' }, //retrieved by GA at least initially, maybe allow edits later
    externalGaAccountId: { type: 'string' },
    gaWebPropertyId: { type: 'string' },
    gaProfileId: { type: 'string' },
    gscSiteUrl: { type: 'string' },
    gscPermissionLevel: { type: 'string' }, //might not use anywhere...
    gaSiteUrl: { type: 'string' },

    //associations
    userId: { model: 'users', required: true },
    googleAccountId: { model: 'providerAccounts', required: true },
    audits: {
      collection: 'audits',
      via: 'websiteId'
    },
    auditLists: {
      collection: 'auditLists',
      via: 'websiteId'
    },
    auditListItems: {
      collection: 'auditListItems',
      via: 'websiteId'
    },
  },
  autoCreatedAt: true,
  autoUpdatedAt: true,
};

