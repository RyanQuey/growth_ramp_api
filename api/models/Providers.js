/**
 * Provider.js
 *
 * @description ::
 *
 * this is provider information for each social network that a user has configured for growth_ramp. Arguably, this be better be called userProviders, but provider is shorter
 *
 * note that many of the columns may be slightly different than the user information, but is what the user information is from the provider, when the user is using the provider (e.g., their account information in the social network)
 *
 */
import { PROVIDER_STATUSES, PROVIDERS } from "../constants"

module.exports = {

  attributes: {
    name: {
      type: 'string',
      required: true,
      enum: Object.keys(PROVIDERS)
    }, //"e.g., FACEBOOK"
    //should make a hash of these, to dehash before sending
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    email: { type: 'string' },
    //these are the different channels that the user has for this account, in the metadata for those channels
    channels: { type: 'json', defaultsTo: {} },
    userName: { type: 'string' },
    profilePictureUrl: { type: 'string' },
    status: { type: 'string', defaultsTo: "ACTIVE", enum: PROVIDER_STATUSES },

    //**associations**
    user: { model: 'users', required: true },

    //the data below you will just be helpful later on, for analytics/filtering etc.
    plans: {
      collection: 'plans',
      via: 'providers'
    },
    //these are the configurations associated with a given plan
    posts: {
      collection: 'posts',
      via: 'providers'
    },
    messages: {
      collection: 'messages',
      via: 'provider'
    },
  },


};

