const apiKey = sails.config.env.GOOGLE_API_KEY
const Google = {
  shortenUrl: (url, options = {}) => {
    return new Promise((resolve, reject) => {
      axios.post(`https://www.googleapis.com/urlshortener/v1/url?key=${apiKey}`, {longUrl: url})
      .then((res) => {
        const result = res.data
        //result will be like: {
        //  kind: "urlshortener#url,
        //  id: (short url)
        //  longUrl: (long url)
        //}
        console.log("success", result);
        return resolve(result.id)
      })
      .catch((err) => {
        console.log("error shortening URL");
        let error = Helpers.safeDataPath(err, "response.data.error", err)
        console.log(error);
        if (options.alwaysResolve) {
          return resolve(error)
        } else {
          return reject(error)
        }

      })
    })
  },
  expandUrl: (url, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!url) {
        console.log("no url provided; skip sending");
        return resolve("")
      }

      axios.get(`https://www.googleapis.com/urlshortener/v1/url?key=${apiKey}&shortUrl=${url}`)
      .then((res) => {
        const result = res.data
        //result will be like: {
        //  kind: "urlshortener#url,
        //  id: (short url)
        //  longUrl: (long url)
        //  status: "OK" (or "MALWARE"...if fishy)
        //}
        return resolve(result.longUrl)
      })
      .catch((err) => {
        console.log("error expanding URL");
        let error = Helpers.safeDataPath(err, "response.data.error", err)
        console.log(error);
        if (options.alwaysResolve) {
          return resolve(error)
        } else {
          return reject(error)
        }
      })
    })
  },
  getUrlAnalytics: (url, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!url) {
        console.log("no url provided; skip sending");
        return resolve({})
      }

      axios.get(`https://www.googleapis.com/urlshortener/v1/url?key=${apiKey}&shortUrl=${url}&projection=FULL`)
      .then((res) => {
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
      .catch((err) => {
        console.log("error getting analytics for URL");
        let error = Helpers.safeDataPath(err, "response.data.error", err)
        console.log(error);
        if (options.alwaysResolve) {
          return resolve(error)
        } else {
          return reject(error)
        }

      })
    })
  },
}

module.exports = Google
