const apiKey = sails.config.env.GOOGLE_API_KEY
const Google = {
  shortenUrl: (url) => {
    return new Promise((resolve, reject) => {
console.log("url");
console.log(url);
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
        console.log(Helpers.safeDataPath(err, "response.data.error.errors", err));
      })
    })
  },
  expandUrl: (url) => {
    return new Promise((resolve, reject) => {
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
        console.log(Helpers.safeDataPath(err, "response.data.errors", err));
      })
    })
  },
  getUrlAnalytics: (url) => {
    return new Promise((resolve, reject) => {
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
        console.log(Helpers.safeDataPath(err, "response.data.errors", err));
      })
    })
  },
}

module.exports = Google
