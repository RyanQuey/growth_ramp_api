/**
 * WorkgroupMemberships.js
 *
 * @description :: NOTE: it is unfortunate that we have to have a separate model for this, but was struggling with any other way, getting an "unknown error" from waterline when following their docs for a many-to-many, and some had offered this as a solution, so just running with it. make sure to capitalize/lowercase things as shown in this example.
 * createdAt is basically when a user joined the group
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

