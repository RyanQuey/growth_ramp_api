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

const Twitter = {
  createPost: (account, post, utms) => {
    //just returning the promises in these returned functions
    Twit = _setup(account)
    if (post.uploadedContent && post.uploadedContent.length ) {
      return Twitter._uploadAndPost(post, utms, Twit)
    } else {
      return Twitter[post.channel](post, utms, Twit)
    }
  },

  //upload the files and then create post
  _uploadAndPost: (post, utms, Twit) => {
    return new Promise((resolve, reject) => {
      // Note: You can also do this yourself manually using T.post() calls if you want more fine-grained
      // // control over the streaming. Example: https://github.com/ttezel/twit/blob/master/tests/rest_chunked_upload.js#L20
      const uploads = post.uploadedContent.map((c) => c.url)
      const promises = uploads.map((url) => Twitter._upload(url, Twit))

      Promise.all(promises)
      .then((uploadsData) => {

        return Twitter[post.channel](post, utms, Twit, uploadsData)
      })
      .then((data) => {
        return resolve(data)
      })
      .catch((err) => {
        console.log(err);
        return reject(err)
      })
    })
  },

  //upload a file
  _upload: (url, Twit) => {
    return new Promise((resolve, reject) => {
      // Note: You can also do this yourself manually using T.post() calls if you want more fine-grained
      // // control over the streaming. Example: https://github.com/ttezel/twit/blob/master/tests/rest_chunked_upload.js#L20
      Twit.postMediaChunked({ file_path: url})
      .then((data, response) => {
        console.log("finished upload");
        console.log(data, response);

//might not need; this helper might take care of it for us
        const mediaId = data.media_id_string
        //not doing this yet
        const altText = ""

        const metaParams = {
          media_id: mediaId,
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
  PERSONAL_POST: (post, utms, Twit, uploadsData) => {
    return new Promise((resolve, reject) => {
      Twit.post('statuses/update', {status: post.text}, (err, data, response) => {
        if (err) {}

        console.log(data, response);
      })

    })


  },
  /*
  _retweet: (post,  utms, Twit, uploadsData) => {
    Twit = _setup(account)

    Twit.post(`statuses/retweet/:id`, {id: post.id}, (err, data, response) => {
      if (err) {}

      console.log(data, response);
    })
  },
  */
  //can make posts with images, music, etc sent in the body, not just urls too
}


module.exports = Twitter
