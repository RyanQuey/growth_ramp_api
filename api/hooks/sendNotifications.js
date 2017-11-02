var SendNotifications = require('../../backgroundJobs/send_notifications');
module.exports = function sendNotifications(sails) {
  return {
    initialize: function (cb) {
      sails.on('hook:orm:loaded', function() {
console.log("initializing background job");
        var notifier = new SendNotifications({ model: Notifications })
        notifier.every('30 seconds').now().start();
        cb ();
      });
    }
  }
}
