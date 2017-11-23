const Google = {
  shortenUrl: (url) => {
    return new Promise((resolve, reject) => {
      axios.post(`https://www.googleapis.com/urlshortener/v1/url?key=${process.env.GOOGLE_API_KEY}`, {longUrl: url})
      .then((result) => {
        //result will be like: {
        //  kind: "urlshortener#url,
        //  id: (short url)
        //  longUrl: (long url)
        //}
        return resolve(result)
      })
      .catch((err) => {
        console.log("error shortening URL");
      })
    })
  },
  expandUrl: (url) => {
    return new Promise((resolve, reject) => {
      axios.get(`https://www.googleapis.com/urlshortener/v1/url?key=${process.env.GOOGLE_API_KEY}&shortUrl=${url}`)
      .then((result) => {
        //result will be like: {
        //  kind: "urlshortener#url,
        //  id: (short url)
        //  longUrl: (long url)
        //  status: "OK" (or "MALWARE"...if fishy)
        //}
        return resolve(result)
      })
      .catch((err) => {
        console.log("error shortening URL");
      })
    })
  },
  getUrlAnalytics: (url) => {
    return new Promise((resolve, reject) => {
      axios.get(`https://www.googleapis.com/urlshortener/v1/url?key=${process.env.GOOGLE_API_KEY}&shortUrl=${url}&projection=FULL`)
      .then((result) => {
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
        console.log("error shortening URL");
      })
    })
  },
}

module.exports = Google
