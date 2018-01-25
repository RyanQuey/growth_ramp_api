var actionUtil = require('sails/lib/hooks/blueprints/actionUtil');
var _ = require('lodash');

/**
 * Find One Record
 *
 * get /:modelIdentity/:id
 *
 * An API call to find and return a single model instance from the data adapter
 * using the specified id.
 *
 * Required:
 * @param {Integer|String} id  - the unique id of the particular instance you'd like to look up *
 *
 * Optional:
 * @param {String} callback - default jsonp callback param (i.e. the name of the js function returned)
 */

module.exports = function findOneRecord (req, res) {

  var Model = actionUtil.parseModel(req);
  var pk = actionUtil.requirePk(req);

  // This is a special thing added for eVet; however, not all controllers support it; so, if it makes it this far, we need to get rid of it.
  // Controllers that do support it would have handled it before this time.
  if (req.query && req.query.format) {
    delete req.query.format;
  }

  let finish = (err, matchingRecord) => {
    if (err) return res.serverError(err);
    if(!matchingRecord) return res.notFound('No record found with the specified `id`.');

    if (req.forbiddenIf && req.forbiddenIf(matchingRecord)) {
      return res.forbidden();
    }

    if (req.parsing) {
      let keys = Object.keys(req.parsing);
      for (let key of keys) {
        if (matchingRecord.hasOwnProperty(key)) {
          matchingRecord[key] = req.parsing[key](matchingRecord[key]);
        }
      }
    }

    if (req.process) {
      req.process(matchingRecord);
    }

    if (req._sails.hooks.pubsub && req.isSocket) {
      Model.subscribe(req, matchingRecord);
      actionUtil.subscribeDeep(req, matchingRecord);
    }

    req.model = Model;

    res.ok(matchingRecord);
  };

  if (req.sql) {
    sails.log.debug(req.sql);
    Model.query(`SELECT * FROM ${Model.identity} ${req.sql}`, (err, stuff) => { if (err) { throw new Error(err); } finish(err, stuff.rows[0]); });
  } else if (req.fullSql) {
    sails.log.debug(req.fullSql);
    Model.query(req.fullSql, (err, stuff) => { if (err) { throw new Error(err); } finish(err, stuff.rows[0]); });
  } else {
    var query = Model.findOne(pk)
    query = actionUtil.populateRequest(query, req);
    query.exec(finish);
  }
};
