const apiKey = process.env.GOOGLE_API_KEY || sails.config.env.GOOGLE_API_KEY
const clientId = process.env.CLIENT_GOOGLE_ID || sails.config.env.CLIENT_GOOGLE_ID
const clientSecret = process.env.CLIENT_GOOGLE_SECRET || sails.config.env.CLIENT_GOOGLE_SECRET

const google = require('googleapis');

const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
  clientId,
  clientSecret,
  redirectUrl, //probably won't ever use, since not doing actual oauth handling in backend
);

//pass this in if want to use our api key as the auth
//probably only for url shortening...if that
const urlshortener = google.urlshortener({
  version: 'v1',
  auth: apiKey,
});


const Google = {
  //provide account in general. accessToken here if, like we do with FB, Twitter, LI, check access token before making post and so have latest accesstoken in memory but not set on the account. For now, not making post with Google Plus, so it's fine
  _setup: (account, accessToken) => {
    oauth2Client.setCredentials({
      access_token: ProviderAccounts.decryptToken(account.accessToken),
      refresh_token: ProviderAccounts.decryptToken(account.refreshToken), //if no refresh token, will fail
      // Optional, provide an expiry_date (milliseconds since the Unix Epoch, so this is one week)
      expiry_date: (new Date()).getTime() + (1 * 1000 * 60 * 60 * 24 * 7)
    });

    // will send this in each request with {auth: oauthClient} (except for url shortener...althought that might change soon too)
    return oauth2Client
  },

  //all these helpers are now accessible at Google.analytics.___
  shortenUrl: (url, options = {}) => {
    return new Promise((resolve, reject) => {
      //axios.post(`https://www.googleapis.com/urlshortener/v1/url?key=${apiKey}`, {longUrl: url})
      urlshortener.url.post({longUrl: url}, (err, res) => {
        if (err) {
          console.log("error shortening URL");
          let error = Helpers.safeDataPath(err, "response.data.error", err)
          console.log(error);
          if (options.alwaysResolve) {
            return resolve(error)
          } else {
            return reject(error)
          }
        }

        const result = res.data
        //result will be like: {
        //  kind: "urlshortener#url,
        //  id: (short url)
        //  longUrl: (long url)
        //}
        console.log("success", result);
        return resolve(result.id)
      })
    })
  },
  expandUrl: (url, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!url) {
        console.log("no url provided; skip sending to Google utm shortening");
        return resolve("")
      }

      //axios.get(`https://www.googleapis.com/urlshortener/v1/url?key=${apiKey}&shortUrl=${url}`)
      urlshortener.url.get({shortUrl: url}, (err, res) => {
        if (err) {
          console.log("error expanding URL");
          let error = Helpers.safeDataPath(err, "response.data.error", err)
          console.log(error);
          if (options.alwaysResolve) {
            return resolve(error)
          } else {
            return reject(error)
          }
        }

        const result = res.data
        //result will be like: {
        //  kind: "urlshortener#url,
        //  id: (short url)
        //  longUrl: (long url)
        //  status: "OK" (or "MALWARE"...if fishy)
        //}
        return resolve(result.longUrl)
      })
    })
  },
  getUrlAnalytics: (url, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!url) {
        console.log("no url provided; skip sending url Analytics");
        return resolve({})
      }

      //axios.get(`https://www.googleapis.com/urlshortener/v1/url?key=${apiKey}&shortUrl=${url}&projection=FULL`)
      urlshortener.url.get({
        shortUrl: url,
        projection: "FULL",
      }, (err, res) => {
        if (err) {
          console.log("error getting analytics for URL");
          let error = Helpers.safeDataPath(err, "response.data.error", err)
          console.log(error);
          if (options.alwaysResolve) {
            return resolve(error)
          } else {
            return reject(error)
          }
        }

        const result = res.data
        //result will be like: {
        //  kind: "urlshortener#url,
        //  id: (short url)
        //  longUrl: (long url)
        //  status: "OK" (or "MALWARE"...if fishy)
        //  created:
        //  analytics:
        //    allTime:
        //    month:
        //    week:
        //    day:
        //    twoHours:
        //}
        return resolve(result)
      })
    })
  },
}

module.exports = Google
