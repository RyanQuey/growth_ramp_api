var RunRoutineAudits = require('../../backgroundJobs/audits');

module.exports = function runRoutineAudits(sails) {
  return {
    initialize: function (cb) {
      sails.on('hook:orm:loaded', function() {
        console.log("initializing background job: run routine audits");

        var publisher = new RunRoutineAudits()
        if (process.env.NODE_ENV === "production") {
          publisher.every('30 minutes').now().start();
        } else {
          publisher.every('5 minutes').now().start();
        }

        console.log("doing cb for audits");
        cb();
      });
    }
  }
}
