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
    objectId: { type: 'text', required: true }, // e.g., the post or plan to have temporary access to. depends on the action
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
      let tokenRecord
      Tokens.findOne({token: tokenString})
      .then((t) => {
        tokenRecord = t
        if (!tokenRecord) {
          return
        } else if (tokenRecord.expires < moment.utc().format()) {
          //TODO token has expired
        } else if (!tokenRecord.valid){
          //TODO this token has been invalidated (maybe a later one for same action, maybe already used, etc)

        } else {
          switch (tokenRecord.action){
            case "confirmation":
              return Tokens.checkConfirmationToken(tokenRecord, currentUser)
            case "login":
              return Users.login({id: currentUser.id}, {emailConfirmed: true})

            default:
              console.log("should never get here");
              return "broken token"
          }
        }
      })
      .then((result) => {
        //result will either be an object with a message
        return resolve({result, token: tokenRecord.token})
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
        //if result is an updated user, it is successful, so invalidate token
        if (result.id) {Tokens.invalidate(token)}

        return resolve(result)
      })
      .catch((err) => {
        console.log(err);
        return reject(err)
      })
    })
  },
};
