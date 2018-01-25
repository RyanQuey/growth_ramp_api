var actionUtil = require('sails/lib/hooks/blueprints/actionUtil');
var _ = require('lodash');

module.exports = function createRecords (req, res) {

    var Model = actionUtil.parseModel(req);

    if (!req.model) {
      req.model = Model;
    }

    let toCreate = [];
    let created = [];

    for (i = req.body.length; i--;) {
      toCreate.push(actionUtil.parseValues(req));
    }

    let create = (data) => {
      Model.create(data).exec(function created (err, newInstance) {
          if (err) {
            return done(err);
          }

          if (req._sails.hooks.pubsub) {
              if (req.isSocket) {
                  Model.subscribe(req, newInstance);
                  Model.introduce(newInstance);
              }
              var publishData = _.isArray(newInstance) ? _.map(newInstance, function(instance) {return instance.toJSON();}) : newInstance.toJSON();
              Model.publishCreate(publishData, !req.options.mirror && req);
          }

          done(null, newInstance);
      });
    }

    let done = (err, newInstance) => {
      if (err) {
        return res.negotiate(err);
      }

      created.push(newInstance);
      if (toCreate.length > 0 ) {
        create(toCreate.pop());
      } else {
        res.created(created);
      }
    }

    create(toCreate.pop());
};
