/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    email: { type: 'string', required: true, regex: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/},
    phone: { type: 'string', regex: /\+1\d{3}\d{3}\d{4}/ },
    firstName: { type: 'string' },
    lastName: { type: 'string' },

    //associations
    providers: {
      collection: 'provider',
      via: 'user',
      dominant: true
    },

    plans: {
      collection: 'plan',
      via: 'user'
    },
    posts: {
      collection: 'post',
      via: 'user'
    },
    messages: {
      collection: 'message',
      via: 'user'
    },

  },
  autoCreatedAt: true
  //autoUpdatedAt: true,
};

