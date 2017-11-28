/**
 * Channels.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

import { PROVIDER_STATUSES, PROVIDERS } from "../constants"
module.exports = {

  attributes: {
    name: {type: 'string'},
    type: {
      type: 'string',
      required: true,
    },
    provider: { //should always match the provider account provider
      type: 'string',
      required: true,
      enum: Object.keys(PROVIDERS)
    }, //"e.g., FACEBOOK"
    providerChannelId: { type: 'string' }, //given by provider

    //should make a hash of these, to dehash before sending
    accessToken: { type: 'string' },
    accessTokenExpires: { type: 'datetime' },//not sure how I get or use this
    sharingAllowed: { type: 'boolean' },
    userPermissions: { type: 'json', defaultsTo: {} },
    otherInfo: { type: 'json', defaultsTo: {} }, //this is just a catchall

    //**associations**
    userId: { model: 'users', required: true },
    providerAccountId: { model: 'providerAccounts', required: true },
    postTemplates: {
      collection: 'postTemplates',
      via: 'channelId',
      dominant: true
    },
    posts: {
      collection: 'posts',
      via: 'channelId',
      dominant: true
    },

    // Override the default toJSON method
    toJSON: function() {
      let obj = this.toObject();
      obj.accessToken = obj.accessToken ? true : false;

      return obj;
    },

  }
};

