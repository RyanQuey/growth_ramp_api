/**
 * WebsitesController
 *
 * @description :: Server-side logic for managing Audittestresults
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const blueprints = require('../blueprints');
module.exports = {
  find: (req, res) => {
    return blueprints.find(req, res);
  },
	reactivateOrCreate: (req, res) => {
    // these are the params that, if any of them are different, need to create a unique record. Otherwise, just update

    const params = Object.assign({}, req.body)
    params.status = "ACTIVE"
    const uniqParams = _.pick(params, ["gaProfileId", "gaSiteUrl", "gaWebPropertyId", "googleAccountId", "gscSiteUrl", "userId"])

    Websites.updateOrCreate(uniqParams, params)
    .then((result) => {
      if (Array.isArray(result)) {
        result = result[0]
      }

      // currently only allowing one
      Websites.update({id: {"!": result.id}}, {status: "ARCHIVED"})

      return res.ok(result)
    })
    .catch((err) => {
      console.error("Error reactivating or creating website: ", err);
      return res.negotiate(err)
    })
  },
};

