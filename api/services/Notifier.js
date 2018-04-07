var templates = require('../templates/');
var from = 'Growth Ramp <hello@growthramp.io>';

//creates a record in the notifications table, which the background job will eventually pick up and send
module.exports = {
  //email from customer to us
  //sent directly from http post
  contactUs: function (data) {
    let info = {
      user: data.user,
      type: data.type,
      message: data.message,
    };

    return templates.contactUs(info)
    .then((template) => {
      let emailNotification = {
        method: 'email',
        subject: template.email.subject,
        body: template.email.body,
        plainTextMessage: info.message,
        identifier: 'contact-us',
        userId: info.user.id,
        addresses: ["hello@growthramp.io"],
        from,
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
        from,
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
        from,
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
        from,
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
  newAuditNotification: function (info) {
		templates.newAuditNotification(info)
		.then((template) => {
			let emailNotification = {
				method: 'email',
				subject: template.email.subject,
				body: template.email.body,
				addresses: [ info.email ],
        from,
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
