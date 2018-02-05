const apiKey = process.env.GOOGLE_API_KEY || sails.config.env.GOOGLE_API_KEY
const google = require('googleapis');
const urlshortener = google.urlshortener('v1');
google.options({
  auth: apiKey,
})

const _setup = (account, accessToken) => {
  const fb = new FB.Facebook({
    //this lib automatically adds the app secret key
    appId,
    appSecret,
    accessToken,
    version: 'v2.10',
    timeout_ms: 60*1000, //1 min
  })

  return fb
}

const Google = {
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
