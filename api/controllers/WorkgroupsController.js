/**
 * WorkgroupsController
 *
 * @description :: Server-side logic for managing Workgroups
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const blueprints = require('../blueprints');
module.exports = {
  find: (req, res) => {
    return blueprints.find(req, res);
  },
  create:  (req, res) => {
    let workgroup
    Workgroups.create({ownerId: req.user.id, name: req.body.name})
    .then((w) => {
      workgroup = w
      //create the record in the joins table
      return WorkgroupMemberships.create({memberId: req.user.id, workgroupId: workgroup.id})
    })
    .then((join) => {
      return res.ok(workgroup)
    })  //leaving default population on, to be able to return the group
    .catch((err) => {
      console.log(err);
      res.negotiate(err)
    })
  },
  //find groups for this user
	find: (req, res) => {
    //not really using this...use Users.find.populate(memberships)
    //TODO custom SQL  for performance
    Users.findOne(req.user.id).populate("memberships") //.populate("workgroups") removed since owner is also member, so can just populate memberships   .then((workgroups) => {
    .then((user) => {
      const workgroups = user.memberships
      return res.ok(workgroups)
    })
    .catch((err) => {
      return res.badRequest(err)
    })
  },


};

