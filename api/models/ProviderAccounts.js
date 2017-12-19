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
import crypto from 'crypto'
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || sails.config.env.TOKEN_ENCRYPTION_KEY //must be 256 bytes (32 characters)
const IV_LENGTH = 16 // For AES, this is always 16

import { PROVIDER_STATUSES, PROVIDERS } from "../constants"
const providerApiWrappers = {
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

  beforeValidate: (values, cb) => {
    if (values.accessToken) {
      values.accessToken = ProviderAccounts.encryptToken(values.accessToken)
    }
    if (values.refreshToken) {
      values.refreshToken = ProviderAccounts.encryptToken(values.refreshToken)
    }
    if (values.accessTokenSecret) {
      values.accessTokenSecret = ProviderAccounts.encryptToken(values.accessTokenSecret)
    }
console.log("before validating");
console.log(values);
    cb()
  },

  //takes access or refresh token and encrypt, adding unique key to end
  //http://vancelucas.com/blog/stronger-encryption-and-decryption-in-node-js/
  encryptToken: (token) => {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', new Buffer(TOKEN_ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(token);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    //attaches the iv to the encrypted token for later retrieval.
    let fullEncryptedString = iv.toString('hex') + ':' + encrypted.toString('hex');
    return fullEncryptedString
  },

  decryptToken: (text) => {
    let textParts = text.split(':');
    let iv = new Buffer(textParts.shift(), 'hex');
    let encryptedText = new Buffer(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', new Buffer(TOKEN_ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);
    let token = decrypted.toString();

    return token
  },

  //runs before loginWithProvider
  //trades tokens or whatever that needs to be done.
  //The extra roundtrips that haven't happened yet.
  //so far, only FB needs it
  handleOauthData: (providerAccountData) => {
    return new Promise((resolve, reject) => {
      const provider = providerAccountData.provider
      if (!provider) {return reject("no provider defined")}

      //if don't have to do anything
      if (!providerApiWrappers[provider].handleOauthData) {
        //can return unchanged
        return resolve(providerAccountData)
      } else {
        return resolve(providerApiWrappers[provider].handleOauthData(providerAccountData))
      }
    })
  },

  loginWithProvider: (user, providerAccountData) => {

    //0) confirm / extract user information from provider
    //1) find user (if already has an account and is logged in) and account
    //2) determine what to do with both user and account information
    //create or update account information including the account tokens
    //.1) return user info, along with plans and campaigns and API token, to the client server

    return new Promise((resolve, reject) => {
      //0)
      if (!providerAccountData.provider) {return reject("no provider defined")}

      //1) get Provider Account
      //cannot just updateOrCreate, because you have to check if something is amiss (see `else if (provider && user)` conditional below)
      //return ProviderAccounts.updateOrCreate({userId: user.id, name: providerAccountData.name}, providerAccountData)
      //might create security hole ...? too tired to think about right now
      ProviderAccounts.findOne({
        provider: providerAccountData.provider,
        providerUserId: providerAccountData.providerUserId
      })
      .then((account) => {
        //handling the different situations here
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
          // creating an account with social login
          // **********************************************
          // not allowing for now
          // TODO reenable this, if can figure out way to make sure they don't create multiple accounts accidentally, and then not be able to use our app.
          // maybe prompt them or something
          // This works though once uncommented
          throw {message: "Not allowing signup with provider", code: 'no-sign-up-with-oauth'}//ProviderAccounts.createUserWithProvider(providerAccountData)

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
      .spread((userRecord, providerRecord) => {
        //should be in array [user, provider]
        //NOTE: if logging in for the first time, `user` is an object with two properties: {user, plans: userPlans}
        // TODO: can use the provider information to give a success message in the browser
        if (!userRecord || !providerRecord) {throw {message: "didn't retrieve provider or user correctly."}}

        const ret = {
          user: userRecord,
          provider: providerRecord
        }
        return resolve(ret)
      })
      .catch((err) => {
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

  //sorts accounts, grouping according to provider
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
    let providerAccount

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
      .then((p) => {
        providerAccount = p

        //get/check token
        if (
          !PROVIDERS[providerAccount.provider].tokensExpire ||
          //if no entry in column, this will return false, which is what we want also
          moment.utc(providerAccount[`${tokenType}TokenExpires`]).isAfter(moment.utc()) ||
          true //TODO keep until am getting accessTokenExpires from all providers
          //NOTE twitter tokens never expire
        ) {
          //token is found and valid
          console.log("token is found and is valid");
          return {
            [`${tokenType}Token`]: providerAccount[`${tokenType}Token`]
          }

        } else if (tokenType === "access") {
          //try to refresh
          console.log("trying to refresh");
          return ProviderAccounts.getAccessTokenFromProvider(account.refreshTokaccount.provider, account)

        } else {
          //just return it to be handled by parent function
          console.log("token cannot be retrieved");
          return {
            message: `${tokenType} token expired and cannot be retrieve; prompt user to reauthenticate for account ${providerAccount.id}`,
            code: "no-token-retrieved",
            status: 500,
          }
        }
      })
      //result is either a token string OR an object error message
      .then((result) => {
        if (typeof result[`${tokenType}Token`] === "string") {
          //result has the token, but is encrypted
          //now need to decrypt real quick:

          result[`${tokenType}Token`] = ProviderAccounts.decryptToken(result[`${tokenType}Token`])
        }

        //check if needs accessTokenSecret (so far, only Twitter), and if so, get it
        if (tokenType === "access" && PROVIDERS[providerAccount.provider].requiresAccessTokenSecret) {
          //should either be returned with the accessToken when refreshed account OR should be in account already...if not, something went wrong
          let accessTokenSecret = result.accessTokenSecret ? result.accessTokenSecret : providerAccount.accessTokenSecret
          result.accessTokenSecret = ProviderAccounts.decryptToken(accessTokenSecret)

          if (!accessTokenSecret) {
            //override result; this access token won't work after all
            result = {
              message: `access token was found, but access token secret is required and could not be found for account ${providerAccount.id}`,
              code: "no-token-retrieved",
              status: 500,
            }
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
  //for getting using refresh token
  //TODO implement, and use the Services for the social networks
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

  //seems like no one has one?
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
      let results

      //api will be the api for the social network
      let api = providerApiWrappers[account.provider]
      let pagination = {} //TODO probably have to set this... see LI for example of what I need; fb doesn't seem to need



      //publishes post on social network
      ProviderAccounts.getUserToken(account, "access")
      .then((accessTokenData) => {
        return api.getChannels(account, channelType, pagination, accessTokenData)
      })
      .then((r) => {
        results = r

        //by the time data is here, results should be ready to persist into the db
        const promises = results.map((channel) => {
          channel.providerAccountId = account.id
          channel.provider = account.provider
          channel.userId = account.userId
          channel.type = channelType

          //if don't have a channel with this provider and of this type with this id, make a new one. Otherwise, update with new values
          return Channels.updateOrCreate({
            providerChannelId: channel.providerChannelId,
            provider: channel.provider,
            type: channel.type,
          }, channel)
        })


        return Promise.all(promises)
      })
      .then((updatedRecords) => {
        return resolve(updatedRecords)
      })
      .catch((err) => {
        console.log("Failure refreshing channel type");
        console.log(err);
        return reject(err)
      })
    })

  },

};

