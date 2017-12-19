/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

import { PROVIDER_STATUSES, PROVIDERS } from "../constants"

module.exports = {
  //TODO: if the asynchronous stuff gets too complicated, try async lib, which is placed as a global in sails by default

  ////////////////////////////////////////////////////////
  //login / authentication stuff
  ///////////////////////////////////////////////////////////

  authenticate: function (req, res) {
		let email = req.body.email;
		let password = req.body.password;
    //this is any token but a login token
    let tokenString = req.body.token

    const checkUser = () => {
  		if (req.body.loginToken) {
  			return Users.tokenAuthenticate(email, req.body.loginToken)
      } else {
  		  return Users.passwordAuthenticate(email, password)
      }
    }

    //user with plans, posts, etc
    let user, populatedUser
    checkUser()
		.then((authenticatedUser) => {

      return Users.login(authenticatedUser)
    })
    .then((u) => { //u has the right api token
      user = u
      return Users.initialUserData(user)
    })
    .then((p) => {
      populatedUser = p
      if (tokenString) {
        //check if need to send a success/failure message
        return Tokens.processToken(tokenString, user)
      } else {
        return "no token to process and that's ok"
      }
    })
    .then((result) => {
      //if we want to let users know they confirmed successfully, could return something here
			return res.ok(populatedUser);
		})
		.catch((err) => {
      console.log(err);
			return res.forbidden(err);
		});
  },

	loginWithProvider: ((req, res) => {
    const providerAccountData = req.body
    const currentUser = req.user

    ProviderAccounts.handleOauthData(providerAccountData)
    .then((data) => {
      //data should either be regular providerAccountData OR transformed data
      return ProviderAccounts.loginWithProvider(currentUser, data)
    })
    .then((userAndAccount) => {
      //TODO don't send refresh and access tokens
      //eventually need to build up the provider information with this
      return res.ok(userAndAccount)
    })
    .catch((err) => {
      console.log("error when logging in with provider:")
      console.log(err);
      if (err.code === "no-sign-up-with-oauth") {
        return res.send(403, err)
      } if (err.code === "unregistered-email") {
        return res.send(403, err)
      }
      return res.negotiate(err)
    })
  }),


	signOut: function (req, res) {
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

//not currently using
	/*checkSession: function (req, res) {
		if (!req.user) {
			return res.forbidden();
		}

		return res.ok(req.user);
	},*/

	resetPassword: function (req, res)  {
		let email = req.param('email') || req.body.email;

		if (!email) {
      console.log("should not have this problem");
			return res.badRequest({ code: 400, error: 'E-mail is required' });
		}

		let info, user;

		Users.findOneByEmail(email)
		.then((u) => {
			if (!u) {
				// It isn't okay, but we don't want to tell anyone that.
				return res.ok();
				throw new Error();
			}

			user = u;
      return Users.update({id: user.id}, {password: ""})
    })
    .then((updatedUser) => {
      //destroy any previous if they exist
			return Tokens.destroy({ userId: user.id, action: 'resetPassword' });
		})
		.then(() => {
			return Tokens.create({ objectId: user.id, objectType: 'user', userId: user.id, action: 'resetPassword', token: Tokens.generateToken(16) });
		})
		.then((t) => {
			info = {
        email: email,
				token: t.token
			};

      return Notifier.resetPassword(info)
		})
    .then(() => {
			return res.ok();
    })
		.catch((err) => {
			sails.log.error(error);
			return res.badRequest();
		});
	},

  ///////////////////////////////////////////////////////////
  //user plans actions
  ///////////////////////////////////////////////////////////

  //will be used when initializing a new user session
  //populates plans and providers that user has access to read
  initialUserData: ((req, res) => {
    Users.initialUserData(req.user.id)
    .then((ret) => {
      res.ok(ret)
    })
    .catch((err) => {
      console.log(err);
      res.negotiate(err)
    })

  }),
  ///////////////////////////////////////////////////////////
  //user posts actions
  ///////////////////////////////////////////////////////////
  //default is to get all user posts, but eventually should paginate, filter, etc.
  getCampaigns: ((req, res) => {
    //could also do req.params.id, since it is in the route
    Campaigns.find({userId: req.user.id, status: {"!": "ARCHIVED"}})
    .then((ret) => {
      res.ok(ret)
    })
    .catch((err) => {
      console.log(err);
      res.negotiate(err)
    })

  }),
  ///////////////////////////////////////////////////////////
  //user provider actions
  ///////////////////////////////////////////////////////////

};

