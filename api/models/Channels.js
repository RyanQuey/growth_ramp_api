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
    forumName: {type: 'string'}, // forums are subdivisions for channels. But is used for the thing that channels are a part of (eg, for slack, workspaces)
    // add forumId, forumUrl, etc later. Or...move from forum to something else, if there's a use case. Only thing to subdivide channels so far seems to be for chat though, so using forum
    type: {
      type: 'string',
      required: true,
    },
    provider: { //should always match the provider account provider
      type: 'string',
      required: true,
      enum: Object.keys(PROVIDERS)
    }, //"e.g., FACEBOOK"
    unsupportedChannel: { type: 'boolean' },
    providerChannelId: { type: 'string' }, //given by provider

    //should make a hash of these, to dehash before sending
    accessToken: { type: 'string' },
    accessTokenExpires: { type: 'datetime' },//not sure how I get or use this
    sharingAllowed: { type: 'boolean' },
    userPermissions: { type: 'json', defaultsTo: {} }, //permissions that a user has within this channel (ie, is admin, etc (?))
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

