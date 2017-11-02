var AutomatedInvoices = require('../../backgroundJobs/invoices');
module.exports = function sendNotifications(sails) {
  return {
    initialize: function (cb) {
      // TODO: Switch invoicing to QuickBooks and turn it on.
      return cb();
      // sails.on('hook:orm:loaded', function() {
      //   // TODO: Enable in production.
      //   if (process.env.NODE_ENV === 'development') {
      //     var notifier = new AutomatedInvoices({ models: sails.models }).every('12 hours').now().start();
      //   }
      //
      //   cb ();
      // });
    }
  }
}
