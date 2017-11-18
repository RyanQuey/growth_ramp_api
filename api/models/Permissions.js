/**
 * Permissions.js
 *
 * @description :: HOW PERMISSIONS WORK
 *
 *  1) need at least provider account permission to read/write/give permissions for any details of a provider account
 *  3) Group vs user:
 *     - user has permission if either they have a permission or are part of a group with permissions
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    access:       { type: "string", required: true, defaultsTo: "READ" }, //can also be "WRITE" or "ADMIN" (which can manage some things, add other users, etc...but ultimately, a resource has only one user EVER, who cannot lose ownership unless grant that. They are the owner, and they can give and take permission no matter what)
		active:			{ type: "boolean", defaultsTo: true },
    autoCreatedAt: true,
    autoUpdatedAt: true,

    //associations
    // hackey way of doing polymorphic...

    // who receives the permission
    // not supporting individual permissions yet; just do group perms
    // there is already a column for this though
		//userId:			{ model: 'users', type: "string", }, //if shared with a user
		workgroupId:		{ model: 'workgroups', type: "integer" }, //if shared with a workgroup

    //what they get permission for
    providerAccountId: { model: 'providerAccounts', type: "integer"},
    planId: { model: 'plans', type: "integer"}, //if have access to a plan, have access to all posts
  }
};

