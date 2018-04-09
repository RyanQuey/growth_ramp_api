var actionUtil = require('sails/lib/hooks/blueprints/actionUtil');
var _ = require('lodash');

/**
 * Find Records
 *
 *  get   /:modelIdentity
 *   *    /:modelIdentity/find
 *
 * An API call to find and return model instances from the data adapter
 * using the specified criteria.  If an id was specified, just the instance
 * with that unique id will be returned.
 *
 * Optional:
 * @param {Object} where       - the find criteria (passed directly to the ORM)
 * @param {Integer} limit      - the maximum number of records to send back (useful for pagination)
 * @param {Integer} skip       - the number of records to skip (useful for pagination)
 * @param {String} sort        - the order of returned records, e.g. `name ASC` or `age DESC`
 * @param {String} callback - default jsonp callback param (i.e. the name of the js function returned)
 */

//needed to override specifically for this issue:
//https://stackoverflow.com/questions/48409344/sails-blueprints-query-in-url-not-working
module.exports = function findRecords (req, res) {

  // Look up the model
  var Model = actionUtil.parseModel(req);


  // If an `id` param was specified, use the findOne blueprint action
  // to grab the particular instance with its primary key === the value
  // of the `id` param.   (mainly here for compatibility for 0.9, where
  // there was no separate `findOne` action)
  if ( actionUtil.parsePk(req) ) {
    return require('./findOne')(req,res);
  }

  // This is a special thing added for eVet; however, not all controllers support it; so, if it makes it this far, we need to get rid of it.
  // Controllers that do support it would have handled it before this time.
  if (req.query) {
    delete req.query.format;
    delete req.query.source;
  }

  // handle custom searches
  if (req.query.offset) {
    req.query.skip = req.query.offset;
    delete req.query.offset;
  }

  // hacked tis func, using 1.0s, b/c 0.12.13 is breaking my queries!!
  let criteria = parseCriteria(req);
  // first, modify date searches to allow for < and > and whatnot.
  for (let field in criteria) {
    if (Model.definition[field] && Model.definition[field].type === 'datetime') {
      let doIt = (thing) => {
        let match = thing.match(/^([<>=])+(.+)/);
        if (match) {
          if (Array.isArray(criteria[field]) || typeof criteria[field] === 'string') {
            criteria[field] = { };
          }

          criteria[field][match[1]] = match[2];
        }
      };

      if (Array.isArray(criteria[field])) {
        for (let c of criteria[field]) {
          doIt(c);
        }
      } else {
        doIt(criteria[field]);
      }
    }
  }

  let customCriteria = [];
  let customSearches = Model.customSearch || {};
  let attributes = Object.keys(Model.definition);
  for (let att of attributes) {
    if (Model.definition[att].type === 'json' && !customSearches[att]) {
      //customSearches[att] = ObjectSearch.test; //RQ don't know what ObjectSearch is; can't find it anywhere
    }
  }

  for (let key of Object.keys(customSearches)) {
    let ckeys = Object.keys(criteria);
    for (let ckey of ckeys) {
      if (key === ckey || (new RegExp(`^${key}(\..*)?$`)).test(ckey)) {
        let value = criteria[ckey];
        let operator = '=';
        let split = value.split(':');
        if (split.length > 1) {
          let potentialOperator = split[0];
          if (['=', '==', '<=', '>=', '!=', '=~', '!~'].indexOf(potentialOperator) !== -1) {
            value = split[1];
            operator = split[0];
          }
        }
        customCriteria.push({ func: customSearches[key], key: ckey, value, operator });
        delete criteria[ckey];
      }
    }
  }

  let finish = (err, matchingRecords) => {
    if (err) return res.serverError(err);

    // remove "custom criteria" records.
    for (let i = matchingRecords.length; i--;) {
      let record = matchingRecords[i];
      let skip = false;

      for (let cc of customCriteria) {
        if (!cc.func(cc.key, cc.operator, cc.value, record)) {
          matchingRecords.splice(i, 1);
          skip = true;
          break;
        }
      }

      if (skip) {
        continue;
      }

      if (req.parsing) {
        let keys = Object.keys(req.parsing);
        for (let key of keys) {
          if (record.hasOwnProperty(key)) {
            record[key] = req.parsing[key](record[key]);
          }
        }
      }

      if (req.process) {
        req.process(record);
      }
    }

    // Only `.watch()` for new instances of the model if
    // `autoWatch` is enabled.
    if (req._sails.hooks.pubsub && req.isSocket) {
      Model.subscribe(req, matchingRecords);
      if (req.options.autoWatch) { Model.watch(req); }
      // Also subscribe to instances of all associated models
      _.each(matchingRecords, function (record) {
        actionUtil.subscribeDeep(req, record);
      });
    }

    req.model = Model;

    if (req.paginate) {
      res.ok(PaginateResponse.paginate(req, matchingRecords, req.rowCount));
    } else {
      res.ok(matchingRecords);
    }
  };

  // Lookup for records that match the specified criteria

  if (req.query.limit || req.query.perPage || req.query.paginate === 'true') {
    req.paginate = true;
  }

  if (req.sql) {
    Model.query(`SELECT * FROM ${Model.identity} ${req.sql}`, (err, stuff) => { if (err) { throw new Error(err); } finish(err, stuff.rows); });
  } else if (req.fullSql) {
    let doIt = () => {
      Model.query(req.fullSql, (err, stuff) => {
        if (err) {
          return res.serverError(err);
        }
        finish(err, stuff.rows);
      });
    }

    if (req.countSql) {
      Model.query(req.countSql, (err, stuff) => {
        if (err) {
          return res.serverError(err);
        }

        req.rowCount = parseInt(stuff.rows[0].count);

        doIt();
      })
    } else {
      doIt();
    }
  } else {
    let doIt = () => {
      var query = Model.find()
      .where( criteria )
      .limit( actionUtil.parseLimit(req) )
      .skip( actionUtil.parseSkip(req) )
      .sort( actionUtil.parseSort(req) );
      query = actionUtil.populateRequest(query, req);
      query.exec(finish);
    };

    if (req.paginate) {
      Model
      .count()
      .where(criteria)
      .then((c) => {
        req.rowCount = c;

        return doIt();
      });
    } else {
      doIt();
    }
  }
};

//using v1.0's parseCriteria function, since it doesn't break my queries!!!
function parseCriteria (req){
  req.options.criteria = req.options.criteria || {};
  req.options.criteria.blacklist = req.options.criteria.blacklist || ['limit', 'skip', 'sort', 'populate'];

  var blacklist = req.options.criteria && req.options.criteria.blacklist;
  if (blacklist && !_.isArray(blacklist)) {
    throw new Error('Invalid `req.options.criteria.blacklist`. Should be an array of strings (parameter names.)');
  }

  var where = req.allParams().where;
  if (_.isString(where)) {
    try {
      where = JSON.parse(where);
    } catch (e) {
      throw flaverr({ name: 'UsageError' }, new Error('Could not JSON.parse() the provided `where` clause. Here is the raw error: '+e.stack));
    }
  }//>-•

  if (!where) {
    where = req.allParams();
    where = _.omit(where, blacklist || ['limit', 'skip', 'sort']);
    where = _.omit(where, function(p) {
      if (_.isUndefined(p)) { return true; }
    });
  }

  where = _.merge({}, req.options.where || {}, where) || undefined;

  return where
}
