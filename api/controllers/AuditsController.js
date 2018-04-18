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
    const user = req.user
    Websites.findOne({status: "ACTIVE", id: params.websiteId})
    .populate("customLists", {
      status: "ACTIVE",
    })
    .populate("audits", {
      status: "ACTIVE",
      dateLength: "month",
    })
    .then((website) => {
      // if has any monthly audits in the last month, don't run for this site
      const canAudit = Audits.canAuditSite({user, website, audits: website.audits, params})
      if (canAudit) {
        Object.assign(params, {user, website})
        return Audits.createNewAudit(params)

      } else {
        //TODO add other error codes to be mroe precise and accurate...
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

