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

  createLoginToken: function (userId) {
    return Tokens.create({ userId, action: 'login', objectId: userId, token: Tokens.generateToken(6) });
  },

  invalidate: function (token) {
    if (token) {
      return Tokens.update({ id: token.id }, { valid: false });
    } else {
      return new Promise((resolve, reject) => {
        resolve();
      })
    }
  },

  generateToken: function (length) {
    return rs.generate(length);
  }
};
