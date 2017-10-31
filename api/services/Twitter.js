const T = require('twit')
const _setup = (account) => {
  const Twit = new T({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: account.accessToken,
    access_token_secret: account.accessTokenSecret,
    timeout_ms: 60*1000,
  })

  return Twit
}

module.exports = {
  createStatusUpdate: (message, account) => {
    Twit = _setup(account)

    Twit.post('statuses/update', {status: message.text}, (err, data, response) => {
      if (err) {}

      console.log(data, response);
    })
  },
  retweet: (message, account) => {
    Twit = _setup(account)

    Twit.post(`statuses/retweet/:id`, {id: message.id}, (err, data, response) => {
      if (err) {}

      console.log(data, response);
    })
  },

  //can make posts with images, music, etc sent in the body, not just urls too
}
