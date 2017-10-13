/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

import crypto from 'crypto'
module.exports = {

  attributes: {
    email: {
      type: 'string',
      regex: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      required: false,
    },
    phone: { type: 'string', regex: /\+1\d{3}\d{3}\d{4}/ },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    password: { type: 'string' },//store as a hash
    apiToken: { type: 'string' },
    apiTokenExpires: { type: 'string' },

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
      //convert to Boolean, so I can find out if they need to set their password
      obj.password = obj.password ? true : false
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
          return user
        } else {
          return reject({ error: 'invalid password' });
        }
      })
      .then((user) => {
        return Users.login(user)
      })
      .then((userWithToken) => {
         return resolve(userWithToken);
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
    //some users will create an account using a provider, and only later create an email
    if (newUser.email) {
      Users.sendLoginToken(newUser)
      .then(() => { callback(); })
      .catch((err) => { sails.log.error(err); callback(); })
    } else {
      callback()
    }
  },

  login: function (userData) {
    return new Promise((resolve, reject) => {
      let stuff = Users.createApiToken();
      let token = stuff.token;
      let expiration = stuff.expires;

      Users.update({ id: userData.id }, { apiToken: token, apiTokenExpires: expiration })
      .then((result) => {
console.log(result);
        const user = result[0]
        resolve(user);
      })
      .catch((err) => {
        reject(err);
      });
    });
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
  			return reject({ error: 'E-mail is required to receive login token.' });
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
  //NOTE: currently handling this from the policies for the CRUD actions
  //might need this in other cases though?
  /*getPermissions: (token, criteria) => {
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
  },*/

  //might use  eventually, but for now just using policies
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
