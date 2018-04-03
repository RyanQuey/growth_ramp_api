/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

var bcrypt = require('bcrypt');
import crypto from 'crypto'
import {ALLOWED_EMAILS} from '../constants'

module.exports = {

  attributes: {
    email: {
      type: 'string',
      regex: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      required: false,
      unique: true, //might have to add a ;unique index in knex
    },
    phone: { type: 'string', regex: /\+1\d{3}\d{3}\d{4}/ },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    password: { type: 'string', minLength: 8 },//store as a hash
    apiToken: { type: 'string' },
    apiTokenExpires: {  type: 'string' },
    emailConfirmed: { type: 'boolean', defaultsTo: false },
    emailConfirmedAt: { type: "datetime", defaultsTo: null },

    //associations
    providerAccounts: {
      collection: 'providerAccounts',
      via: 'userId',
      dominant: true
    },

    plans: {
      collection: 'plans',
      via: 'userId'
    },
    campaigns: {
      collection: 'campaigns',
      via: 'userId'
    },
    posts: {
      collection: 'posts',
      via: 'userId'
    },
    postTemplates: {
      collection: 'postTemplates',
      via: 'userId'
    },
    audits: {
      collection: 'audits',
      via: 'userId'
    },
    auditLists: {
      collection: 'auditLists',
      via: 'userId'
    },
    auditListItems: {
      collection: 'auditListItems',
      via: 'userId'
    },
    websites: {
      collection: 'websites',
      via: 'userId'
    },
    // not supporting individual permissions yet; just do group perms
    /*permissions: {
      collection: 'permissions',
      via: 'userId'
    },*/
    memberships: {
      collection: 'workgroups',
      via: 'memberId',
      through: 'workgroupmemberships',
    },
    workgroups: { //might not use this very much, since owner is also member, so can just populate memberships
      collection: 'workgroups',
      via: 'ownerId'
    },
    accountSubscriptionId: { model: 'accountSubscriptions', type: "integer", dominant: true },

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

  //makes sure not to persist plain password
  transform: (values) => {
    if (values.password) {
      let orig = values.password;
      let salt = bcrypt.genSaltSync(10);
      let hash = bcrypt.hashSync(values.password, salt);
      values.password = hash;
    }

    return values;
  },

  beforeValidate: function (values, cb) {
    /*if (values.phone) {
      try {
        values.phone = Helpers.returnPhoneNumber(values.phone);
      } catch (e) {
        sails.log.error('Invalid phone number provided.');
        // return cb('Invalid phone number provided.');
      }
    }*/


    values = Users.transform(values);
    cb();
  },

  //create token for them
  beforeCreate: (user, cb) => {
    /*if (!user.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
      //currently how we are handling payments
      return cb({
        code: "unregistered-email",
        message: "Please contact Growth Ramp at jdquey@gmail.com for help signing up.", //not displaying this; just pick something in frontend
        status: 403
      })
    }*/

    let tokenInfo = Users.createApiToken();
    user.apiToken = tokenInfo.token;
    user.apiTokenExpires = tokenInfo.expires;

    cb();
  },

  //send them an email with their password, which they can reset
  afterCreate: function (newUser, cb) {
    //some users will create an account using a provider, and only later create an email
    //can send an email to that one too
    if (newUser.email) {
      Notifier.signupConfirmation(newUser)
    }

    cb()
  },

	passwordAuthenticate: function (userData, password) {
    return new Promise((resolve, reject) => {
      if (!userData || !password) {
        return reject({ error: 'Invalid user or password specified' });

      //string can be id or email
      }

      Users.findOne({email: userData})
      .then((user) => {
        if (user && user.authenticate(password)) {
          return resolve(user)
        } else {
          return reject({ error: 'invalid password' });
        }
      })
      .catch((err) => {
        console.log(err);
        return reject(err)
      })
    })
	},

  login: function (userData) {
    return new Promise((resolve, reject) => {
      let user
      Users.findOne(userData.id)
      .then((u) => {
        user = u
        //not always updating token, which allows for multiple browsers to stay loggedin
        if (!user.apiToken || !user.apiTokenExpires || moment.utc().isAfter(moment(user.apiTokenExpires))) {
          let apiTokenObj = Users.createApiToken();
          let apiToken = apiTokenObj.token;
          let expiration = apiTokenObj.expires;

          return Users.update({ id: userData.id }, { apiToken: apiToken, apiTokenExpires: expiration })
        } else {
          //faking the update
          return [user]
        }

      })
      .then((result) => {
        user = result[0]

        return resolve(user)
      })
      .catch((err) => {
        return reject(err);
      });


    });
  },

  //is called when user who has an account starts a session
  //nicely sends everything all at once; saves some trips
  //does not get run on signup; there just return {user: user} to emulat
  initialUserData: (userData) => {
    return new Promise((resolve, reject) => {
      const promises = []
      let userId
      if (typeof userData === "object") {
        userId = userData.id

      //this should be the userid
      } else if (["number", "string"].includes(typeof userData)) {
        userId = userData
        promises.push(Users.findOne(userData))
      }

      //TODO do not want to population here, unless groups are reasonable amount
      //otherwise, populate only when necessary, to increase speed of initial load
      promises.unshift(ProviderAccounts.find({userId}).populate('channels'))
      promises.unshift(Plans.find({userId, status: "ACTIVE"}))
      promises.unshift(AccountSubscriptions.findOne({userId})) //makes sure this data is up to date
      promises.unshift(Websites.find({userId, status: "ACTIVE"})) //makes sure this data is up to date

      return Promise.all(promises)
      .then(([websites, accountSubscription, plans, accounts, user]) => {
        const sortedAccounts = ProviderAccounts.sortAccounts(accounts)
        const sortedPlans = Helpers.sortRecordsById(plans)

        let userRecord
        //i.e., if had to search for the user record just now
        if (user) {
          userRecord = user
        } else {
          userRecord = userData
        }

        resolve({
          user: userRecord,
          plans: sortedPlans,
          providerAccounts: sortedAccounts,
          accountSubscription,
          websites,
        });
      })
    })
  },

  createApiToken: () => {
    return {
      token: 'user-' + crypto.randomBytes(64).toString('hex'),
      expires: moment.utc().add(7, 'days').format()
    };
  },

  //might just call Notifier directly??
	sendLoginToken: function (user) {
    return new Promise((resolve, reject) => {
  		if (!user.email) {
  			return reject({ error: 'E-mail is required to receive login token.' });
  		}

  		Users.findOneByEmail(user.email)
  		.then((user) => {
  			if (!user) {
					return reject({ error: 'No user with that e-mail was found.' });
				}

  			return Notifier.sendLoginToken(user)
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
