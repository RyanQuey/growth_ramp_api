/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.bootstrap.html
 */
const MomentRange = require('moment-range');
const Moment = require('moment');
module.exports.bootstrap = function(cb) {

  //do these belong here? I don't know, but it works

  global.moment = MomentRange.extendMoment(Moment)
  global.axios = require('axios').default;
  //necessary b/c used es6 there
  global.Helpers = require('../api/services/Helpers').default
  // It's very important to trigger this callback method when you are finished
  // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  cb();
};
