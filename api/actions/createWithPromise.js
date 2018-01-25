var actionUtil = require('sails/lib/hooks/blueprints/actionUtil');
var _ = require('lodash');

module.exports = function createWithPromise (req, res) {
  return new Promise((resolve, reject) => {
  	var Model = actionUtil.parseModel(req);

    if (!req.model) {
      req.model = Model;
    }

  	// Create data object (monolithic combination of all parameters)
  	// Omit the blacklisted params (like JSONP callback param, etc.)
  	var data = actionUtil.parseValues(req);


  	// Create new instance of model using data from params
  	Model.create(data).exec(function created (err, newInstance) {

  		// Differentiate between waterline-originated validation errors
  		// and serious underlying issues. Respond with badRequest if a
  		// validation error is encountered, w/ validation info.
  		if (err) {
        return reject(err);
      }

  		// If we have the pubsub hook, use the model class's publish method
  		// to notify all subscribers about the created item
  		if (req._sails.hooks.pubsub) {
  			if (req.isSocket) {
  				Model.subscribe(req, newInstance);
  				Model.introduce(newInstance);
  			}
  			// Make sure data is JSON-serializable before publishing
  			var publishData = _.isArray(newInstance) ?
  								_.map(newInstance, function(instance) {return instance.toJSON();}) :
  								newInstance.toJSON();
  			Model.publishCreate(publishData, !req.options.mirror && req);
  		}

      resolve(newInstance);
  	});
  });
};
