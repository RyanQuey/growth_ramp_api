const T = require('twit')
//NOTE don't get accessToken from account record; that is encrypted still
const _setup = (account, accessTokenData) => {
  const Twit = new T({
    consumer_key: process.env.TWITTER_CONSUMER_KEY || sails.config.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET || sails.config.env.TWITTER_CONSUMER_SECRET,
    access_token: accessTokenData.accessToken,
    access_token_secret: accessTokenData.accessTokenSecret,
    timeout_ms: 60*1000,
  })

  return Twit
}
//PERSONAL_POST, PRIVATE_MESSAGE
//not supporting private message yet

const Twitter = {
  createPost: (account, post, channel = false, accessTokenData) => {
    //just returning the promises in these returned functions
    const Twit = _setup(account, accessTokenData)
    if (post.uploadedContent && post.uploadedContent.length ) {
      return Twitter._uploadAndPost(post, Twit)
    } else {
      return Twitter[post.channelType](post, Twit)
    }
  },

  //upload the files and then create post
  _uploadAndPost: (post, Twit) => {
    return new Promise((resolve, reject) => {
      // Note: You can also do this yourself manually using T.post() calls if you want more fine-grained
      // // control over the streaming. Example: https://github.com/ttezel/twit/blob/master/tests/rest_chunked_upload.js#L20
      const uploads = post.uploadedContent.map((c) => c.url)
      const promises = uploads.map((url) => Twitter._upload(url, Twit))

      Promise.all(promises)
      .then((uploadsData) => {

        return Twitter[post.channelType](post, Twit, uploadsData)
      })
      .then((data) => {
        console.log("SUCCESSFUL post to Twitter");
        console.log(data);

        //already getting post key when creating hte post
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
  PERSONAL_POST: (post, Twit, uploadsData) => {
    return new Promise((resolve, reject) => {
      const params = {status: `${post.text} ${post.shortUrl}`}
      if (uploadsData) {
        //should be array of responses from uploading media
        const mediaIds = uploadsData.map((u) => u.mediaId)
        params.media_ids = mediaIds
      }

      console.log(params);
      Twit.post('statuses/update', params)
      .then((result) => {
         //Twitter actually sends back a ton of data, might want to save more?
         //full user object, created at, who it responds to, hashtags, etc
  console.log("result from Twitter");
  console.log(result.data);

        //this is how Twitter/Twit returns errors
        if (result.data.errors) {

          //throw new Error("Failed to publish: " + result.data.errors.map((e) => e.message).join("; "))
          //just handle the first for now TODO
          return reject(Twitter.handleError(result.data.errors[0]))

        } else {
          //could grab integer here; id is only numbers, but am saving as string, so whatver
          let postKey = Helpers.safeDataPath(result, "data.id_str", "")
          return resolve({postKey})

        }
      })
    })
//TODO extract out response data here, so can be returned correctly whether or not uploading stuff
//will extract out different things depending on the channel anyway, so this is best
  },

  getChannels: (account, channelType, pagination) => {
    return new Promise((resolve, reject) => {
      return reject("no channels available to get for twitter")
    })
  },

  //TODO test
  handleError: (err, code = false) => {
    code = code || err.code

    //this will be returned to the front end, which will handle depending on the code
    let ret = {code: "", originalError: err}

    switch (code) {
      case 32: //HTTP 401
        // they removed permissions, or access token expired
        // this shouldn't publish
        ret.code = 'require-reauthorization'
        break
      case 93: //HTTP 403
        // they never gave us this scope...
        // should never get here, but here it is
        // this shouldn't publish
        ret.code = 'insufficient-permissions'
        break
      case 88:
        // rate limit reached
        // this shouldn't publish
        ret.code = 'rate-limit-reached'
        break
      default:
        ret.code = 'unknown-error-while-publishing'
        break
    }

    return ret
  },
  /*
  _retweet: (post,  utms, Twit, uploadsData) => {
    Twit = _setup(account)

    Twit.post(`statuses/retweet/:id`, {id: post.id}, (err, data, response) => {
      if (err) {}

      console.log(data, response);
    })
  },
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
  PERSONAL_POST: (post, Twit, uploadsData) => {
      const params = {status: `${post.text} ${post.shortUrl}`}
      if (uploadsData) {
        //should be array of responses from uploading media
        const mediaIds = uploadsData.map((u) => u.mediaId)
        params.media_ids = mediaIds
      }

      console.log(params);
    return Twit.post('statuses/update', params)
    .then((result) => {
       //Twitter actually sends back a ton of data, might want to save more?
       //full user object, created at, who it responds to, hashtags, etc
console.log("result from Twitter");
console.log(result.data);

      //this is how Twitter/Twit returns errors
      if (result.data.errors) {

        throw new Error("Failed to publish: " + result.data.errors.map((e) => e.message).join("; "))
      } else {
        let postKey = Helpers.safeDataPath(result, "data.id_str", "")  //could grab integer here; id is only numbers, but am saving as string, so whatver
        return {postKey}

      }
    })
//TODO extract out response data here, so can be returned correctly whether or not uploading stuff
//will extract out different things depending on the channel anyway, so this is best
  },

  getChannels: (account, channelType, pagination) => {
    return new Promise((resolve, reject) => {
      return reject("no channels available to get for twitter")
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
