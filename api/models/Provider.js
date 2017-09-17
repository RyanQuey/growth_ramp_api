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

module.exports = {

  attributes: {
    providerName: { type: 'string', required: true }, //"e.g., FACEBOOK"
    //token??: { type: 'string', required: true },
    email: { type: 'string' },
    displayName: { type: 'string' },
    profilePictureUrl: { type: 'string' },

    active: { type: 'boolean', defaultsTo: true },
    //associations
    user: { model: 'user', required: true },
    //these are the different channels that the user has for this account, in the metadata for those channels
    channels: { type: 'json', defaultsTo: {} },

    //the data below you will just be helpful later on, for analytics/filtering etc.
    plans: {
      collection: 'plan',
      via: 'providers'
    },
    //these are the configurations associated with a given plan
    channelConfigurations: { //note:
      collection: 'channelConfiguration',
      through: 'plans',
      via: 'providers'
    },
    posts: {
      collection: 'post',
      through: 'clans',
      via: 'provider'
    },
    messages: {
      collection: 'message',
      via: 'provider'
    },

  }
  //all possible providers that can be in the provider column
  PROVIDERS: {
    //keep this in sync with the frontend constant
  },

};

