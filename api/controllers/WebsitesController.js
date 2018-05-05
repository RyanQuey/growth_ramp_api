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

    let accountSubscription
    return AccountSubscriptions.findOrInitializeSubscription(req.user)
    .then((result) => {
      accountSubscription = result
      // don't allow changing quantity below their website count
      return Websites.find({
        userId: req.user.id,
      })
    })
    .then((websites) => {
      const activeWebsites = websites.filter((site) => site.status === "ACTIVE")
      const canCreate = Websites.canAddWebsite({user: req.user, websites: activeWebsites, accountSubscription})
      if (!canCreate) {
        throw {code: "too-many-websites-for-account"}
      }

      // what needs to be unique for each website record
      const uniqParams = ["gaProfileId", "gaSiteUrl", "gaWebPropertyId", "googleAccountId", "gscSiteUrl", "userId"]

      const matchingWebsite = _.find(websites, (site) => _.isEqual(_.pick(params, uniqParams), _.pick(site, uniqParams)))
      if (!matchingWebsite) {
        return Websites.create(params)

      } else {
        // check if they're abusing their payment plan...
        const reasonablePeriod = moment().subtract(1, "month")
        if (User.isSuper(req.user) || moment(matchingWebsite.updatedAt).isBefore(reasonablePeriod)) {
          // is legit enough, let's let it slide, Just reactivate site
          return Websites.update({id: matchingWebsite.id}, params)
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

      return res.ok(result)
    })
    .catch((err) => {
      console.error("Error reactivating or creating website: ", err);
      return res.negotiate(err)
    })
  },
};

