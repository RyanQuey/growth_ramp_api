/**
 * Workgroups.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    name: {type: "string", required: true },
    autoCreatedAt: true,
    autoUpdatedAt: true,

    //associations
    ownerId: { model: 'users', type: "integer", required: true },
    permissions: {
      collection: 'permissions',
      via: 'workgroupId'
    },
    members: {
      collection: 'users',
      via: 'workgroupId',
      through: 'workgroupmemberships',
    },
  }
};
