/**
 * AuditsController
 *
 * @description :: Server-side logic for managing Audittestresults
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const blueprints = require('../blueprints');
module.exports = {
  find: (req, res) => {
    return blueprints.find(req, res);
  },

  auditContent: (req, res) => {
    Audits.auditContent(req.user, req.allParams())
    .then((results) => {
      return res.ok(results)
    })
    .catch((err) => {
      //Google returns err.errors
      console.error("Error auditing content for user", req.user.id);
      return res.negotiate(err.errors || err)
    })
  },

};

