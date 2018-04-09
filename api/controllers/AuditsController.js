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
    const params = req.allParams()
    Websites.findOne({status: "ACTIVE", id: params.websiteId})
    .populate("audits", {
      status: "ACTIVE",
      dateLength: "month",
    })
    .then((website) => {
      // if has any monthly audits in the last month, don't run for this site
      const canAudit = Audits.canAuditSite({user, website, audits: website.audits})
      if (canAudit) {
        return Audits.auditContent(req.user, req.allParams())

      } else {
        throw {code: "already-audited"}
      }
    })
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

