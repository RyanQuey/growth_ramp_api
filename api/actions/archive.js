var actionUtil = require('sails/lib/hooks/blueprints/actionUtil');
var _ = require('lodash');

module.exports = function updateOneRecord (req, res) {

  // Look up the model
  var Model = actionUtil.parseModel(req);

  if (!req.model) {
    req.model = Model;
  }

  // Locate and validate the required `id` parameter.
  var pk = actionUtil.requirePk(req);

  // have to include 'id' here for potential beforeValidate checks.
  var values = _.merge({ 'archived': true, id: pk }, req.body);

  var query = Model.findOne(pk);
  query = actionUtil.populateRequest(query, req);
  query.exec(function found(err, matchingRecord) {

    if (err) { return res.serverError(err); }
    if (!matchingRecord) { return res.notFound(); }

    Model.update(pk, values).exec(function updated(err, records) {
      if (err) { return res.negotiate(err); }

      if (!records || !records.length || records.length > 1) {
        req._sails.log.warn(`Unexpected output from '${Model.globalId}.update'.`);
      }

      var updatedRecord = records[0];

      // If we have the pubsub hook, use the Model's publish method
      // to notify all subscribers about the update.
      if (req._sails.hooks.pubsub && Model._publishUpdate) {
        if (req.isSocket) { Model.subscribe(req, _.pluck(records, Model.primaryKey)); }
        Model.publishUpdate(pk, _.cloneDeep(values), !req.options.mirror && req, {
          previous: _.cloneDeep(matchingRecord.toJSON())
        });
      }

      res.ok(updatedRecord);
    });// </updated>
  }); // </found>
};
