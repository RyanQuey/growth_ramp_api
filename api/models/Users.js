/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

import crypto from 'crypto'
module.exports = {

  attributes: {
    email: { type: 'string', regex: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/},
    phone: { type: 'string', regex: /\+1\d{3}\d{3}\d{4}/ },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    password: { type: 'string' },//store as a hash

    //associations
    providers: {
      collection: 'providers',
      via: 'userId',
      dominant: true
    },

    plans: {
      collection: 'plans',
      via: 'userId'
    },
    posts: {
      collection: 'posts',
      via: 'userId'
    },
    messages: {
      collection: 'messages',
      via: 'userId'
    },

    // Override the default toJSON method, which is called before returning data back to the client
    toJSON: function() {
      let obj = this.toObject();
      delete obj.password;
      return obj;
    },

    authenticate: function (password) {
      return bcrypt.compareSync(password, this.password);
    }

  },
  autoCreatedAt: true,
  autoUpdatedAt: true,

	passwordAuthenticate: function (user, password) {
    return new Promise((resolve, reject) => {
      let getUser

      if (!user || !password) {
        reject({ error: 'Invalid user or password specified' });

      //string can be id or email
      } else if (typeof user === 'string') {
        getUser = () => {
          return Users.find({ or: [ { id: user }, { email: user } ] })
          .then((users) => {
            if (err || users.length === 0) {
              reject({ error: 'No users match that email/id (whichever was passed in)' });
            } else {
              return users[0]
            }
          })
          .catch((err) => {
            reject({ error: 'error getting user' });
          })
        }

      //user is the whole user record
      } else {
        getUser = () => {
          return user
        }
      }

      getUser()
      .then((user) => {
        if (user.authenticate(password)) {
          resolve(user);
        } else {
          reject({ error: 'invalid password' });
        }
      })
      .catch((err) => {
        reject(err)
      })
    })
	},

  //create token for them
  beforeCreate: (user, cb) => {
    let tokenInfo = Users.createApiToken();
    user.apiToken = tokenInfo.token;
    user.apiTokenExpires = tokenInfo.expires;

    cb();
  },

  //send them an email with their password, which they can reset
  afterCreate: function (newUser, callback) {
    Users.sendLoginToken(newUser)
    .then(() => { callback(); })
    .catch((err) => { sails.log.error(err); callback(); })
  },


  createApiToken: () => {
    return {
      token: 'user-' + crypto.randomBytes(64).toString('hex'),
      expires: moment.utc().add(7, 'days').format()
    };
  },

	sendLoginToken: function (user) {
    return new Promise((resolve, reject) => {
  		if (!user.email) {
  			return reject({ error: 'E-mail is required.' });
  		}

  		Users.findByEmail(email)
  		.then((user) => {
  			if (!user) {
					return reject({ error: 'No user with that e-mail was found.' });
				}

  			return user //UserNotifier.sendLoginToken(user) need to implement mailer
  		})
  		.catch((e) => {
  			sails.log.error(e);
  			return reject(e);
  		})
    })
	},

  //check permissions via API token
  //optionally pass in criteria to find the specific permission eg, {planId: "...", role: "ADMIN"}
  getPermissions: (token, criteria) => {
    return new Promise((resolve, reject) => {
      if (!token) {
        return reject();
      }

      Users.findOneByApiToken(token).populate("permissions", criteria)
      .then((user) => {
        //TODO
      })
      .catch((err) => {
        return reject();
      });
    });
  },

  canModify: function (req, userId) {
    let user = req.user;

    return new Promise((resolve, reject) => {
      if (user && user.id === userId) {
        resolve();
      } else {
        reject({ status: 403 });
      }
    });
  }
};
