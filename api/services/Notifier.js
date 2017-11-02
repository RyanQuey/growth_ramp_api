var templates = require('../templates/');
var from = 'Growth Ramp <support@growthramp.io>';

//creates a record in the notifications table, which the background job will eventually pick up and send
module.exports = {
  signupConfirmation: function (user) {
    let info = {};

    return Tokens.createConfirmationToken(user.id)
    .then((token) => {
      info = {
        user: user,
        token: token.token
      };

      return templates.signupConfirmation(info);
    })
    .then((template) => {
      let emailNotification = {
        method: 'email',
        subject: template.email.subject,
        body: template.email.body,
        identifier: 'signup-confirmation',
        userId: info.user.id,
        addresses: [info.user.email],
        from: "support@growthramp.io",
      };
      return Notifications.create(emailNotification)
    })
    .then((notif) => {
      console.log("notification", notif);
    })
    .catch((e) => {
      sails.log.error(e);
    });
  },
  sendLoginToken: function (user) {
    let info = {};

    return Tokens.createLoginToken(user.id)
    .then((token) => {
      info = {
        user: user,
        token: token.token
      };

      return templates.loginToken_user(info);
    })
    .then((template) => {
      let emailNotification = {
        method: 'email',
        subject: template.email.subject,
        body: template.email.body,
        identifier: 'send-login-token',
        userId: info.user.id,
        addresses: [info.user.email],
        from:  "support@growthramp.io",
      };

      Notifications.create(emailNotification)
    })
    .then((notif) => {})
    .catch((e) => {
      sails.log.error(e);
    });
  },
  resetPassword: function (info) {
		templates.resetPassword(info)
		.then((template) => {
			let emailNotification = {
				method: 'email',
				subject: template.email.subject,
				body: template.email.body,
				addresses: [ info.email ],
				from:  "support@growthramp.io"
			};

			sails.log.debug(emailNotification);
			return Notifications.create(emailNotification)
    })
    .then((notif) => {
    })
    .catch((err) => {
      console.log(err);
    })
  },

}
