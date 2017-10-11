/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

import { PROVIDER_STATUSES, PROVIDERS } from "../constants"

module.exports = {
  //TODO: if the asynchronous stuff gets too complicated, try async lib, which is placed as a global in sails by default

  //login / authentication stuff
  authenticate: function (req, res) {
		let email = req.body.email;
		let password = req.body.password;

    const checkUser = () => {
  		if (req.body.token) {
  			return Users.tokenAuthenticate(email, req.body.token)
      } else {
  		  return Users.passwordAuthenticate(email, password)
      }
    }

    checkUser()
		.then((user) => {
      Users.login(user)
    })
    .then((user) => {
			return res.ok(user);
		})
		.catch((e) => {
			return res.forbidden(e);
		});
  },

	loginWithProvider: ((req, res) => {
    Providers.loginWithProvider(req)
    .then((userAndProvider) => {
      //TODO don't send refresh and access tokens
      //eventually need to build up the provider information with this
      return res.ok(userAndProvider)
    })
    .catch((err) => {
      console.log(err);
      return res.negotiate(err)
    })
  }),


	logout: function (req, res) {
		if (!req.user) {
			return res.forbidden();
		}

		Users.update({ id: req.user.id }, { apiToken: '' })
		.then((user) => {
			return res.ok();
		}).catch((e) => {
			return res.badRequest();
		});
	},

	checkSession: function (req, res) {
		if (!req.user) {
			return res.forbidden();
		}

		return res.ok(req.user);
	},

	resetPassword: function (req, res)  {
		let email = req.param('email') || req.body.email;

		if (!email) {
			return res.badRequest({ code: 400, error: 'E-mail is required' });
		}

		let info, user;

		Users.update({email}, {})
		.then((u) => {
			if (!u) {
				// It isn't okay, but we don't want to tell anyone that.
				return res.ok();
				throw new Error();
			}

			user = u;

			return Tokens.destroy({ userId: user.id, action: 'resetPassword' });
		})
		.then(() => {
			return Tokens.create({ objectId: user.id, objectType: 'user', userId: user.id, action: 'resetPassword', token: Tokens.generateToken(16) });
		})
		.then((t) => {
			info = {
				token: t.token
			};

			return templates.resetPassword(info);
		})
		.then((template) => {
			let emailNotification = {
				method: 'email',
				subject: template.email.subject,
				body: template.email.body,
				addresses: [ user.email ],
				from: "Next In Line <no-reply@nextinline.io>"
			};

			sails.log.debug(emailNotification);
			Notifications.create(emailNotification).then((notif) => {});

			return res.ok();
		})
		.catch((err) => {
			sails.log.error(error);
			return res.badRequest();
		});
	},

  //user provider actions
  addProvider: ((req, res) => {

  //1) verify user via token
  //2) create or update provider information
  //3) update the provider tokens, basically part of 2
  //4) return user info, along with plans and posts and API token, to the client server

    //
    //.then((user) => {
    //req.user should already be set by the API token policy
      console.log(req.user);
    /*})
    .catch((err) => {
      console.log(err);
    })*/

  }),

};

