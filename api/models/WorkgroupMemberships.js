/**
 * WorkgroupMemberships.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  tableName: "workgroups_members__memberships_workgroups",
  attributes: {
    //associations
    workgroupId: { model: 'workgroups', type: "integer", required: true },
    memberId: { model: 'users', type: "integer", required: true },
  }
};

