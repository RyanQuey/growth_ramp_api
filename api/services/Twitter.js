const T = require('twit')
const _setup = (account) => {
  const Twit = new T({
    consumer_key: sails.config.env.TWITTER_CONSUMER_KEY,
    consumer_secret: sails.config.env.TWITTER_CONSUMER_SECRET,
    access_token: account.accessToken,
    access_token_secret: account.accessTokenSecret,
    timeout_ms: 60*1000,
  })

  return Twit
}
//PERSONAL_POST, PRIVATE_MESSAGE
//not supporting private message yet
module.exports =

const Twitter = {
  createPost: (account, channel, post, utms) => {
    //just returning the promises in these returned functions
    Twit = _setup(account)
    if (post.uploadedContent && post.uploadedContent.length ) {
      return Twitter._uploadAndPost
    } else {
      return Twitter[channel]()
    }
  },

  //upload the files and then create post
  _uploadAndPost: (channel, post, utms) => {
    return new Promise((resolve, reject) => {
      // Note: You can also do this yourself manually using T.post() calls if you want more fine-grained
      // // control over the streaming. Example: https://github.com/ttezel/twit/blob/master/tests/rest_chunked_upload.js#L20
      const uploads = post.uploadedContent.map((c) => c.url)
      const promises = uploads.map((url) => Twitter._upload(url))

      Promise.all(promises)
      .then((results) => {

        return Twitter[channel](post, utms, )
      })
      .then(() => {
        return resolve(data)
      })
      .catch((err) => {
        console.log(err);
        return reject(err)
      })
    })
  },

  //upload a file
  _upload: (url) => {
    return new Promise((resolve, reject) => {
      // Note: You can also do this yourself manually using T.post() calls if you want more fine-grained
      // // control over the streaming. Example: https://github.com/ttezel/twit/blob/master/tests/rest_chunked_upload.js#L20
      Twit.postMediaChunked({ file_path: url})
      .then((data, response) => {
        console.log("finished upload");
        console.log(data, response);

//might not need; this helper might take care of it for us
        const mediaIdString = data.media_id_string
        //not doing this yet
        const altText = ""

        const metaParams = {
          media_id: mediaIdString,
          alt_text: {
            text: altText
          }
        }

        return resolve(metaParams)
      })
      .catch((err) => {
        console.log(err);
        return reject(err)
      })
    })
  },
  //createStatusUpdate:
  PERSONAL_POST: (post, utms) => {
    return new Promise((resolve, reject) => {
      Twit.post('statuses/update', {status: post.text}, (err, data, response) => {
        if (err) {}

        console.log(data, response);
      })

    })


  },
  /*
  _retweet: (post, account, utms) => {
    Twit = _setup(account)

    Twit.post(`statuses/retweet/:id`, {id: post.id}, (err, data, response) => {
      if (err) {}

      console.log(data, response);
    })
  },
  */
  //can make posts with images, music, etc sent in the body, not just urls too
}


