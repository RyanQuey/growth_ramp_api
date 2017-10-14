/**
 * Provider.js
 *
 * @description ::
 *
 * this is provider information for each social network that a user has configured for growth_ramp. Arguably, this be better be called providerAccounts, but provider is shorter
 *
 * a user may have multiple accounts for a single provider. however, each provider only have one user
 * other users that use this account will have to have a Permission given
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
    email: { type: 'string', required: false },
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
    //1) find user and provider
    //2) determine what to do with both user and provider information
    //create or update provider information including the provider tokens
    //.1) return user info, along with plans and posts and API token, to the client server

    const getUser = (() => {
      //1)
      //if provider data is sent with apiToken, will update this users provider
      if (req.user) {
        return req.user

      //} else if (){
      } else {
        //if no API token provided, check if this provider information matches another user
        //if there is a match, ...not validating the provider data for now, but maybe should?
        //return Users.findOrCreate({providers: }, {})
        return false //
      }
    })


    const getProvider = (providerData) => {
      Providers.findOne({name: providerData.name, providerUserId: providerData.providerUserId})
      //cannot just updateOrCreate, because you have to check if something is amiss (see `else if (provider && user)` conditional below)
      //return Providers.updateOrCreate({userId: user.id, name: providerData.name}, providerData)
      //might create security hole ...? too tired to think about right now
    }

    return new Promise((resolve, reject) => {
      //0)
      let providerData = req.body
      if (!providerData.name) {return reject("no provider defined")}

      //1)
      Promise.all([getUser(), getProvider(providerData)])
      .then((results) => {
        //handling the different situations here
        const [loggedIn, provider] = results
console.log("already existing accounts?");
console.log(loggedIn, provider);
        let promises
        if (provider && !loggedIn) {
          //logging in with a provider
          //TODO only update the relevant part of the provider data, eg not the user ID, etc.
          promises = [Users.login({id: provider.userId}), Providers.update(providerData)]
          return Promise.all(promises)

        } else if (!provider && !loggedIn) {
          //creating an account with social login
          console.log("creating an account with provider");
          return Providers.createUserWithProvider(providerData)

        } else if (provider && loggedIn) {
          //is updating the provider information (particularly the tokens)
          //however, don't allow it if the records don't match (some user has logged into the provider account of some other user)
          if (provider.userId !== user.id) {
            throw {message: "this provider account has already been linked with a different user"}
          }

          promises = [loggedIn, Providers.update(providerData)]
          return Promise.all(promises)

        } else if (!provider && loggedIn) {
          //is linking a new account to an already existing user account
          providerData.userId = user.id
          promises = [loggedIn, Providers.create(providerData)]
          return Promise.all(promises)

        }
      })
      .then((results) => {
        //should be in array [user, provider]
        //NOTE: if logging in for the first time, `user` is an object with two properties: {user, plans: userPlans}
        //no use returning the provider; will make another round-trip later anyways to retrieve all the providers and plans
        const ret = {user: results[0]}
        return resolve(ret)
      })
      .catch((err) => {
        console.log("error when logging in with provider:")
        return reject(err)
      })
    })
  },


  createUserWithProvider: function (providerData) {
    return new Promise((resolve, reject) => {
      let user
      Users.create()
      .then((u) => {
        user = u
        providerData.userId = user.id

        return Providers.create(providerData)
      })
      .then((provider) => {

        return resolve([user, provider])
      })
      .catch((err) => {
        console.log("error creating user with provider");
        reject(err);
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

