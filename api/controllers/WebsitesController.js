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

    Websites.findOne(uniqParams)
    .then((website) => {
      if (!website) {
        return Websites.create(params)

      } else {
        // check if they're abusing their payment plan...
        const reasonablePeriod = moment().subtract(2, "weeks")
        if (moment(website.updatedAt).isBefore(reasonablePeriod)) {
          // is legit enough, let's let it slide, Just reactivate site
          //
          return Websites.update(params)
        } else {
          // they're going back and forth too often
          // just preventing abuse
          throw new Error("too-much-back-and-forth")
        }
      }
    })

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

