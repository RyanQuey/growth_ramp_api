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
const providerWrappers = {
  FACEBOOK: Facebook,
  TWITTER: Twitter,
  LINKEDIN: LinkedIn,
}

module.exports = {
  tableName: "providerAccounts",

  attributes: {
    provider: {
      type: 'string',
      required: true,
      enum: Object.keys(PROVIDERS)
    }, //"e.g., FACEBOOK"

    //should make a hash of these, to dehash before sending
    providerUserId: { type: 'string' },
    accessToken: { type: 'string' },
    accessTokenSecret: { type: 'string' }, //only for twitter, probably because oauth1
    accessTokenExpires: { type: 'datetime' },
    refreshToken: { type: 'string' },
    refreshTokenExpires: { type: 'datetime' },

    //might make this an array, since FB returns multiple emails
    email: { type: 'string', required: false },

    //the channels can be configured by the front end, but the Scopes should be always in sync with their provider's scopes
    //use the exact same strings that the provider takes/returns
    //facebook returns as: {permission: 'the permission', status: 'granted'}
    scopes: { type: 'json', defaultsTo: {} },

    //these are the different channels that the user has for this account, and the metadata for those channels
    //but if they do not have the scope set, they will not be able to post to this channel
    //since scope is set, only use this for friends they want to specifically contact, company pages, groups they are a part of, etc
    //format:
    // {
    //   'GROUP_POST': [
    //     {
    //       id: (whatever id the provider has for this group),
    //       name: [string]
    //       sharingAllowed: boolean; (if sharing is enabled for the company in general; LI uses at least)
    //       canShare: boolean (if current user has permission to share for group, or at least the could if sharingAllowed is true)
    //
    //
    //     }
    //   ]
    // }

    userName: { type: 'string' },
    profileUrl: { type: 'string' },
    photoUrl: { type: 'string' },
    status: { type: 'string', defaultsTo: "ACTIVE", enum: PROVIDER_STATUSES },

    //**associations**
    userId: { model: 'users', required: true },

    //the data below you will just be helpful later on, for analytics/filtering etc.
    //probably don't need it; just search the messages, plans, posts themselves.
    /*plans: {
      collection: 'plans',
      via: 'providerAccounts'
    },
*/
    //these are the configurations associated with a given plan
    posts: {
      collection: 'posts',
      via: 'providerAccountId'
    },
    channels: {
      collection: 'channels',
      via: 'providerAccountId',
    },
    postTemplates: {
      collection: 'postTemplates',
      via: 'providerAccountId',
    },
    permissions: {
      collection: 'permissions',
      via: 'providerAccountId'
    },
    // Override the default toJSON method
    toJSON: function() {
      let obj = this.toObject();
      obj.refreshToken = obj.refreshToken ? true : false;
      obj.accessToken = obj.accessToken ? true : false;

      return obj;
    },
  },


  loginWithProvider(req) {

    //0) confirm / extract user information from provider
    //1) find user (if already has an account and is logged in) and account
    //2) determine what to do with both user and account information
    //create or update account information including the account tokens
    //.1) return user info, along with plans and campaigns and API token, to the client server

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
      return ProviderAccounts.findOne({provider: accountData.provider, providerUserId: accountData.providerUserId})
      //cannot just updateOrCreate, because you have to check if something is amiss (see `else if (provider && user)` conditional below)
      //return ProviderAccounts.updateOrCreate({userId: user.id, name: providerAccountData.name}, providerAccountData)
      //might create security hole ...? too tired to think about right now
    }

    return new Promise((resolve, reject) => {
      //0)
      let providerAccountData = req.body
      if (!providerAccountData.provider) {return reject("no provider defined")}

      //1)
      //TODO Promise.join is easier and more performant
      Promise.all([ getUser(), getProviderAccount(providerAccountData) ])
      .then((results) => {
        //handling the different situations here
        const [user, account] = results
        let promises
        if (account && !user) {
          //logging in with a provider
          //TODO only update the relevant part of the provider data, eg not the user ID, etc.
          promises = [
            Users.login({id: account.userId}),
            ProviderAccounts.update({id: account.id}, providerAccountData),
          ]

          return Promise.all(promises)

        } else if (!account && !user) {
          //creating an account with social login
          return ProviderAccounts.createUserWithProvider(providerAccountData)

        } else if (account && user) {
          //is updating the provider information (particularly the tokens)
          //however, don't allow it if the records don't match (some user has logged into the provider account of some other user)
          if (account.userId !== user.id) {
            throw {message: "this provider account has already been linked with a different user"}
          }

          promises = [user, ProviderAccounts.update({id: account.id}, providerAccountData)]
          return Promise.all(promises)

        } else if (!account && user) {
          //is linking a new account to an already existing user account
          providerAccountData.userId = user.id
          promises = [user, ProviderAccounts.create(providerAccountData)]
          return Promise.all(promises)

        }
      })
      .then((results) => {
        //should be in array [user, provider]
        //NOTE: if logging in for the first time, `user` is an object with two properties: {user, plans: userPlans}
        // TODO: can use the provider information to give a success message in the browser
        if (!results || results.length === 0) {throw {message: "didn't retrieve provider or user correctly."}}

        const ret = {user: results[0], provider: results[1]}
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

  //takes an account (or account id, just pass in a string) and returns access or refresh token (depending on tokenType) if available;
  getUserToken: function(account, tokenType) {
    //get account
    return new Promise((resolve, reject) => {

      new Promise((res, rej) => {
        if (typeof account === "object") {
          return res(account)

        } else if (typeof account === "number") {
          return res(ProviderAccounts.findOne({id: account}))

        } else if (!account || !["string", "object"].includes(typeof account)) {
          return rej("invalid account provided")
        }

  //TODO: need to edit, user might have more than one provider account linked up to theirs
      })
      .then((providerAccount) => {
console.log("provider account");
console.log(providerAccount);
        //get/check token
        if (
          providerAccount[`${tokenType}TokenExpires`] &&
          moment.utc(providerAccount[`${tokenType}TokenExpires`]).isAfter(moment.utc())
        ) {
          //token is found and valid
          console.log("token is found and is valid");
          return providerAccount[`${tokenType}Token`]

        } else if (tokenType === "access") {
          //try to refresh
          console.log("trying to refresh");
          return ProviderAccounts.getAccessTokenFromProvider(account.provider, account)

        } else {
          //just return it to be handled by parent function
          console.log("token cannot be retrieved");
          return {
            message: `${tokenType} token expired and cannot be retrieve; prompt user to reauthenticate`,
            code: "no-token-retrieved",
            status: 500,
          }
        }
      })
      //result is either a token string OR an object error message
      .then((result) => {
        if (typeof result === "string") {
          //result is the token
          result = {
            token: result
          }
        }

        result.accountId = account.id
        result.provider = account.provider

        return resolve(result)
      })
      .catch((err) => {
        return reject(err)
      })
    })
  },

  //please don't pass in an expired refresh token into here
  getAccessTokenFromProvider: function(validRefreshToken, providerName) {
    return new Promise((resolve, reject) => {
      //make a get request, tagging on the refresh token into the query
      axios.get(`${PROVIDERS[providerName].getAccessTokenUrl}?${validRefreshToken}`)
      .then((response) => {
console.log("response from trying to refresh access token");
        console.log(response);
        const accessToken = response.access_token
        const accessTokenExpires = response.expires_in
        const tokenType = response.token_type

        return resolve(response)
      })
      .catch((err) => {
        return reject(err)
      })
    })
  },

  handleNewRefreshToken: function(refreshToken) {

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


  //finds all the channels of a given provider account of a certain channelType
  refreshChannelType: function(account, channelType) {
    return new Promise((resolve, reject) => {

      //api will be the api for the social network
      let api = providerWrappers[account.provider]
      let pagination = {} //TODO probably have to set this... see LI for example of what I need; fb doesn't seem to need

      //publishes post on social network
      api.getChannels(account, channelType, pagination)
      .then((results) => {
console.log("got the channels");
console.log(results);

        //by the time data is here, results should be ready to persist into the db
        const promises = results.map((channel) => {
          channel.providerAccountId = account.id
          channel.provider = account.provider
          channel.userId = account.userId
          channel.type = channelType

          return Channels.updateOrCreate({
            providerChannelId: channel.providerChannelId,
            provider: channel.provider
          }, channel)
        })

        //replace the channels list for that channelType
        let updatedChannels = Object.assign({}, account.channels)

        return Promise.all(promises)
      })
      .then((p) => {
console.log(p);
        return resolve(p)
      })
      .catch((err) => {
        console.log("Failure refreshing channel type");
        console.log(err);
        return reject(err)
      })
    })

  },

};

