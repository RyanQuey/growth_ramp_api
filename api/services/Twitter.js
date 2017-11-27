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
    const Twit = _setup(account)
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
console.log("SUCCESSFUL");
console.log(data);
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
      // Note: seems like I cannot use Twit.postMediaChunked  since it was not liking a url for file path; wanted local path I assume

      let mediaId

      axios.get(url, {responseType: 'arraybuffer'})
      .then((response) => {
        const b64content = new Buffer(response.data, 'binary').toString('base64')
        return Twit.post('media/upload', { media_data: b64content})
      })
      .then((result) => {
        if (result.error || !result.data) {
          console.log(result.error || "no data returned");
          throw new Error("failed to upload to Twitter")
        }
        console.log("finished upload:");
        //response is just the full res data; don't need it, data extracts what I need

        mediaId = result.data.media_id_string
        //not doing this yet
        const altText = ""
        const metaParams = {
          media_id: mediaId,
          alt_text: {
            text: "Picture", //twitter requires it...
          }
        }

        return Twit.post('media/metadata/create', metaParams)
      })
      .then((result) => {
        if (result.error) {
          console.log(result.error);
          throw new Error("failed to set media metadata to Twitter")
        }
        console.log("finished creating media metadata:");

//might not need; this helper might take care of it for us

        return resolve({mediaId})
      })
      .catch((err) => {
        console.log(err);
        return reject(err)
      })
    })
  },
  //createStatusUpdate:
  PERSONAL_POST: (post, utms, Twit, uploadsData) => {
      const params = {status: post.text}
      if (uploadsData) {
        //should be array of responses from uploading media
        const mediaIds = uploadsData.map((u) => u.mediaId)
        params.media_ids = mediaIds
      }

      console.log(params);
    return Twit.post('statuses/update', params)
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
