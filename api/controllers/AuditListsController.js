/**
 * AuditListsController
 *
 * @description :: Server-side logic for managing Audittestresults
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const blueprints = require('../blueprints');
module.exports = {
  find: (req, res) => {
    return blueprints.find(req, res);
  },

  // because sails doesn't allow filtering in populated queries as best as I can tell
  // gets the lists and the items for a given audit
  getPopulatedLists: (req, res) => {
    const params = Object.assign({}, req.allParams(), {status: "ACTIVE"})

    AuditLists.find(params).populate("auditListItems", {status: "ACTIVE"})
    .then((result) => {
      return res.ok(result)
    })
    .catch(err => {
      return res.badRequest(err)
    })
  },
};

