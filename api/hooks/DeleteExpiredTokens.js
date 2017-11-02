var ExpiredTokenDeleter = require('../../backgroundJobs/tokens');
module.exports = function sendNotifications(sails) {
  return {
    initialize: function (cb) {
      sails.on('hook:orm:loaded', function() {
        var tokenDestroyer = new ExpiredTokenDeleter({ models: sails.models }).every('1 hours').now().start();
        cb ();
      });
    }
  }
}
