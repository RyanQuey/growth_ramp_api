var PublishDelayedPosts = require('../../backgroundJobs/publish_delayed_posts');

module.exports = function publishDelayedPosts(sails) {
  return {
    initialize: function (cb) {
      sails.on('hook:orm:loaded', function() {
        console.log("initializing background job: publishing delayed posts");
        var publisher = new PublishDelayedPosts()
        publisher.every('1 minutes').now().start();
        cb ();
      });
    }
  }
}
