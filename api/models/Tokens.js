/**
 * Tokens.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

var rs = require('randomstring');
module.exports = {
  attributes: {
    userId: { model: 'users', type: 'text', required: true },
    action: { type: 'text', required: true }, // e.g., reset-password, login,
    objectId: { type: 'text', required: true }, // e.g., the campaign or plan to have temporary access to. depends on the action
    expires: { type: 'datetime', defaultsTo: function () { return moment.utc().add(12, 'hours').format(); } },
    token: { type: 'text', required: true, defaultsTo: function () { return Tokens.generateToken(16); } },
    valid: { type: 'boolean', defaultsTo: true }
  },

  beforeCreate: function (values, cb) {
    let length = values.token.length;
    if (length < 6) { length = 6; }

    // TODO: Limit the number of tries before upping the length?
    let finish = (exists) => {
      if (exists) {
        values.token = Tokens.generateToken(length);
        look(values.token);
      } else {
        cb();
      }
    }

    let look = (token) => {
      Tokens.findOneByToken(values.token)
      .then((token) => {
        finish(token);
      })
      .catch((err) => {
        cb(err);
      });
    };

    look(values.token);
  },

  createConfirmationToken: function (userId) {
    return Tokens.create({ userId, action: 'confirmation', objectId: userId, token: Tokens.generateToken(6) });
  },

  createLoginToken: function (userId) {
    return Tokens.create({ userId, action: 'login', objectId: userId, token: Tokens.generateToken(6) });
  },

  invalidate: function (token) {
    return Tokens.update({ id: token.id }, { valid: false });
  },

  generateToken: function (length) {
    return rs.generate(length);
  },

  processToken: function(tokenString, currentUser) {
    return new Promise((resolve, reject) => {
      let tokenRecord, tokenType
      Tokens.findOne({token: tokenString})
      .then((t) => {
        tokenRecord = t
        let code
        tokenType = tokenRecord.action

        if (!tokenRecord) {
          return "no-token-found"//will continue as if nothing happened...

        } else if (tokenRecord.expires < moment.utc().format()) {
          //TODO token has expired
          return "expired-token"

        } else if (!tokenRecord.valid){
          //TODO this token has been invalidated (maybe a later one for same action, maybe already used, etc)
          return "invalid-token"

        } else {
          //token is good and ready to be used
          switch (tokenRecord.action){
            case "confirmation":
              return Tokens.checkConfirmationToken(tokenRecord, currentUser)
            case "login":
              return Users.login({id: tokenRecord.userId}, {emailConfirmed: true}) //login token to log you in and confirm email (?)
            //actually, also just logs them in. They have no password, so will be prompted to make a new one
            case "resetPassword":
              return Users.login({id: tokenRecord.userId})

            default:
              console.log("should never get here");
              return "broken-token"
          }
        }
      })
      .then((user, token) => {
        //successful, so invalidating
        Tokens.invalidate(tokenRecord)

        //result will either be an object with a message
        return resolve({
          user,
          token: tokenRecord.token,
          tokenType: tokenType
        })
      })
      .catch((err) => {
        return reject(err)
      })
    })
  },

  //check if user on the token is the user in the session
  checkUser: function (token, user, cb) {
    return new Promise((resolve, reject) => {
      if (user && token.userId === user.id) {
        resolve(cb())
      } else {
        resolve({message: "Need to Login", code: "promptLogin"})
      }
    })
  },

  checkConfirmationToken: function (token, currentUser) {
    return new Promise((resolve, reject) => {
      Tokens.checkUser(token, currentUser, () => {
        return Users.update({id: currentUser.id}, {
          emailConfirmed: true,
          emailConfirmedAt: moment().format(), //might want to do timezone...should standardize this eventually for the backend
        })
      })
      .then((result) => {

        //returning current user first no matter what; this will help other tokens work right
        return resolve(currentUser, token)
      })
      .catch((err) => {
        console.log(err);
        return reject(err)
      })
    })
  },
};
