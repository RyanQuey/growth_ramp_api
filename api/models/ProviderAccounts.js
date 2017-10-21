/**
 * ProviderAccounts.js
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
    provider: {
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
    //might make this an array, since FB returns multiple emails
    email: { type: 'string', required: false },
    //these are the different channels that the user has for this account, and the metadata for those channels
    //but if they do not have the scope set, they will not be able to post to this channel
    channels: { type: 'json', defaultsTo: {} },
    //the channels can be configured by the front end, but the Scopes should be always in sync with their provider's scopes
    //use the exact same strings that the provider takes/returns
    //facebook returns as: {permission: 'the permission', status: 'granted'}
    scopes: { type: 'array', defaultsTo: [] },
    userName: { type: 'string' },
    profileUrl: { type: 'string' },
    status: { type: 'string', defaultsTo: "ACTIVE", enum: PROVIDER_STATUSES },

    //**associations**
    userId: { model: 'users', required: true },

    //the data below you will just be helpful later on, for analytics/filtering etc.
    plans: {
      collection: 'plans',
      via: 'providerAccounts'
    },
    //these are the configurations associated with a given plan
    posts: {
      collection: 'posts',
      via: 'providerAccounts'
    },
    messages: {
      collection: 'messages',
      via: 'providerAccountId'
    },
    // Override the default toJSON method
    toJSON: function() {
      let obj = this.toObject();
      delete obj.refreshToken;
      //delete obj.accessToken; will want this?
      return obj;
    },
  },

  tableName: "providerAccounts",

  loginWithProvider(req) {

    //0) confirm / extract user information from provider
    //1) find user and account
    //2) determine what to do with both user and account information
    //create or update account information including the account tokens
    //.1) return user info, along with plans and posts and API token, to the client server

    const getUser = (() => {
      //1)
      //if account data is sent with apiToken, will update this users provider account
      if (req.user) {
        return req.user

      //} else if (){
      } else {
        //if no API token provided, check if this provider information matches another user
        //if there is a match, ...not validating the provider data for now, but maybe should?
        //return Users.findOrCreate({accounts: }, {})
        return false //
      }
    })


    const getProviderAccount = (accountData) => {
      ProviderAccounts.findOne({provider: accountData.provider, providerUserId: accountData.providerUserId})
      //cannot just updateOrCreate, because you have to check if something is amiss (see `else if (provider && user)` conditional below)
      //return ProviderAccounts.updateOrCreate({userId: user.id, name: providerAccountData.name}, providerAccountData)
      //might create security hole ...? too tired to think about right now
    }

    return new Promise((resolve, reject) => {
      //0)
      let providerAccountData = req.body
      if (!providerAccountData.provider) {return reject("no provider defined")}

      //1)
      Promise.all([getProviderAccount(providerAccountData), getUser()])
      .then((results) => {
        //handling the different situations here
        const [loggedIn, account] = results
console.log("already existing accounts?");
console.log(loggedIn, account);
        let promises
        if (account && !loggedIn) {
          //logging in with a provider
          //TODO only update the relevant part of the provider data, eg not the user ID, etc.
          promises = [Users.login({id: account.userId}), ProviderAccounts.update(providerAccountData)]
          return Promise.all(promises)

        } else if (!account && !loggedIn) {
          //creating an account with social login
          console.log("creating an account with provider");
          return ProviderAccounts.createUserWithProvider(providerAccountData)

        } else if (account && loggedIn) {
          //is updating the provider information (particularly the tokens)
          //however, don't allow it if the records don't match (some user has logged into the provider account of some other user)
          if (account.userId !== user.id) {
            throw {message: "this provider account has already been linked with a different user"}
          }

          promises = [loggedIn, ProviderAccounts.update(providerAccountData)]
          return Promise.all(promises)

        } else if (!account && loggedIn) {
          //is linking a new account to an already existing user account
          providerAccountData.userId = user.id
          promises = [loggedIn, ProviderAccounts.create(providerAccountData)]
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


  createUserWithProvider: function (providerAccountData) {
    return new Promise((resolve, reject) => {
      let user
      Users.create()
      .then((u) => {
        user = u
        providerAccountData.userId = user.id
console.log(providerAccountData);
        return ProviderAccounts.create(providerAccountData)
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

  //sorts accounts, group  according to provider
  sortAccounts: (accounts) => {
    const providerNames = Object.keys(PROVIDERS)
    const sorted = accounts.reduce((acc, account) => {
      const providerName = account.provider
      if (!acc[providerName]) {
        acc[providerName] = [account]
      } else {
        acc[providerName].push(account)

      }

      return acc
    }, {})

    return sorted
  },

  HandleNewRefreshToken: function(refreshToken) {

  },

  userToken: function(providerName, userId, tokenType) {
    new Promise((resolve, reject) => {
      ProviderAccounts.find({
        user: userId,
        name: providerName
      })
//TODO: need to edit, user might have more than one provider account linked up to theirs
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
        return ProviderAccounts.userToken(providerName, userId, "access")
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

