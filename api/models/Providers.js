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
const domain = process.env.CLIENT_URL || 'http://www.local.dev:5000'
const callbackPath = process.env.PROVIDER_CALLBACK_PATH || '/provider_redirect'
const callbackUrl = domain + callbackPath

module.exports = {

  attributes: {
    name: {
      type: 'string',
      required: true,
      enum: Object.keys(PROVIDERS)
    }, //"e.g., FACEBOOK"
    //should make a hash of these, to dehash before sending
    providerUserId: { type: 'string' },
    accessToken: { type: 'string' },
    accessTokenExpires: { type: 'datetime' },
    refreshToken: { type: 'string' },
    refreshTokenExpires: { type: 'datetime' },
    email: { type: 'string' },
    //these are the different channels that the user has for this account, in the metadata for those channels
    channels: { type: 'json', defaultsTo: {} },
    userName: { type: 'string' },
    profilePictureUrl: { type: 'string' },
    status: { type: 'string', defaultsTo: "ACTIVE", enum: PROVIDER_STATUSES },

    //**associations**
    userId: { model: 'users', required: true },

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
      via: 'providerId'
    },
    // Override the default toJSON method
    toJSON: function() {
      let obj = this.toObject();
      delete obj.refreshToken;
      //delete obj.accessToken; will want this?
      return obj;
    },
  },

  loginWithProvider(req) {

    //0) confirm / extract user information from provider
    //1) find or create user
    //2) create or update provider information including the provider tokens
    //.1) return user info, along with plans and posts and API token, to the client server

    const getUser = ((user) => {
      //1)
      if (req.user) {
        return req.user
      } else {
        //maybe findOrCreate? if user hassn't logged in yet for this session?
        return Users.create({}) //could set the profile in here, but I want to force the new user to give an e-mail that will actually work
      }
    })

    return new Promise((resolve, reject) => {
      //0)
      let providerData = req.body
      if (!providerData.name) {return reject("no provider defined")}

      const toReturn = {providerData}
      getUser()
      .then((user) => {
        //2)
        toReturn.user = user
        providerData.userId = user.id

        return Providers.updateOrCreate({userId: user.id, name: providerData.name}, providerData)
      })
      .then((provider) => {
        return resolve(toReturn)
      })
      .catch((err) => {
        console.log("error when logging in with provider:")
        return reject(err)
      })
    })
  },

  HandleNewRefreshToken: function(refreshToken) {

  },

  //setRefreshToken: function(refreshToken) {
  //don't need this unless I'm providing hooks that will happen every time the refresh token is set

  //},

  userToken: function(providerName, userId, tokenType) {
    new Promise((resolve, reject) => {
      Providers.find({
        user: userId,
        name: providerName
      })
      .then((provider) => {
        if (moment(provider[`${tokenType}TokenExpires`]).isAfter(moment())) {
          return provider[`${tokenType}Token`]
        } else {
          throw {message: `${tokenType} token expired`}
        }
      })
      .catch((err) => {
        return reject(err)
      })
    })
  },

  getAccessTokenFromProvider: function(providerName, refreshToken) {
    new Promise((resolve, reject) => {
      if (refreshToken) {
        return
      } else if (!refreshToken && userId) {
        return Providers.userToken(providerName, userId, "access")
      } else {
        return reject("need either a refresh token or userid")
      }
    })
    .then((refreshToken) => {
      //make a get request, tagging on the refresh token into the query
      axios(PROVIDERS[providerName].getAccessTokenUrl + refreshToken)
    })
    .then((response) => {
      console.log(response);
      const accessToken = response.access_token
      const accessTokenExpires = response.expires_in
      const tokenType = response.token_type
    })
    .catch((err) => {
      return reject(err)
    })
  },
    //2) verify the token ...except, not getting this from the browser anymore
    /*return axios.get(`graph.facebook.com/debug_token?
      input_token=${accessToken}
      &access_token=${process.env.SERVER_FACEBOOK_APP_TOKEN}
    `)
  .then((response) => {
    console.log("response",response);
/*    if (!response.data.is_valid) {
       //invalid token
       console.log("invalid token");
    } else if (res.data.app_id !== process.env.CLIENT_FACEBOOK_ID) {
      //this token is not for my app!
    }*///else if (user_id !== ) {}
};

