const FB = require('fb')

const _setup = (account) => {
  const fb = new FB.Facebook({
    //this lib automatically adds the app secret key
    appId: sails.config.env.CLIENT_FACEBOOK_KEY,
    appSecret: sails.config.env.CLIENT_FACEBOOK_SECRET,
    accessToken: account.accessToken,
    version: 'v2.10',
    timeout_ms: 60*1000,
  })

  return fb
}

const Facebook = {
  createPost: (account, post, utms) => {
    return new Promise((resolve, reject) => {
      const fb = _setup(account)
      const body = `${post.text} ${post.contentUrl}?${utms}`

      if (post.uploadedContent && post.uploadedContent.length ) {
        return resolve(Facebook._uploadAndPost(post, body, fb))
      } else {
        return resolve(Facebook[post.channel](post, body, fb, false))
      }
    })
  },

  //upload the files and then create post
  _uploadAndPost: (post, body, fb) => {
    return new Promise((resolve, reject) => {
      // Note: You can also do this yourself manually using T.post() calls if you want more fine-grained
      // // control over the streaming. Example: https://github.com/ttezel/twit/blob/master/tests/rest_chunked_upload.js#L20
      const uploads = post.uploadedContent.map((c) => c.url)
      const promises = uploads.map((url) => Facebook._upload(url, fb))

      Promise.all(promises)
      //these are successful uploads
      .then((uploadsData) => {
        return Facebook[post.channel](post, body, fb, uploadsData )
      })
      .then((data) => {
console.log("result from Facebook");
console.log(data);
        return resolve({postId: data.id})
      })
      .catch((err) => {
        //TODO need to handle if uploads works but post does not; probably remove or unpublish etc
        console.log(err);
        return reject(err)
      })
    })
  },

  //upload a file
  _upload: (url, fb) => {
    return new Promise((resolve, reject) => {
      // Note: You can also do this yourself manually using T.post() calls if you want more fine-grained
      // // control over the streaming. Example: https://github.com/ttezel/twit/blob/master/tests/rest_chunked_upload.js#L20
      fb.api('me/photos', 'post', {
        url: url,
        published: false //to not publish to wall, but still upload content, which remains for 24 hours ONLY unless gets published then. Gets published when post does
      }) //can add a caption
      .then((response) => {
        console.log("finished upload to fb");
        console.log(response);

//might not need; this helper might take care of it for us
//if published, returns a post_id too, of the post the photo is published in
        const mediaId = response.id
        //not doing this yet

        const metaParams = {
          mediaId,
        }

        return resolve(metaParams)
      })
      .catch((err) => {
        console.log(err);
        return reject(err)
      })
    })
  },


  PERSONAL_POST: (post, body, fb, uploadsData) => {
    let params = {
      message: body,
    }
    if (uploadsData) {
      for (let i = 0; i < uploadsData.length; i++) {
        let upload = uploadsData[i]
        let key = `attached_media[${i}]`
        params[key] = JSON.stringify({media_fbid: upload.mediaId})
      }
    }
console.log("params");
console.log(params);
    return fb.api('me/feed', 'post', params)
  },

//TODO set to page...
  PAGE_POST: (post, body, fb, uploadsData) => {
    let params = {
      message: body,
    }
    if (uploadsData) {
      for (let i = 0; i < uploadsData.length; i++) {
        let upload = uploadsData[i]
        let key = `attached_media[${i}]`
        params[key] = JSON.stringify({media_fbid: upload.mediaId})
      }
    }
console.log("params");
console.log(params);
    return fb.api('me/feed', 'post', params)
  },

//TODO set to group...
  GROUP_POST: (post, body, fb, uploadsData) => {
    let params = {
      message: body,
    }
    if (uploadsData) {
      for (let i = 0; i < uploadsData.length; i++) {
        let upload = uploadsData[i]
        let key = `attached_media[${i}]`
        params[key] = JSON.stringify({media_fbid: upload.mediaId})
      }
    }
console.log("params");
console.log(params);
    return fb.api('me/feed', 'post', params)
  },

  //all the posts for one user account
  //not sure if this responds with a promise like the others do ?
  //if not, just have a call back
  batchRequest: (post, account, options = {}) => {
    fb = _setup(account)
    fb.api('', 'post', {batch: post.batch.map((post) => {

      return {
        method: 'post', //or maybe sometimes get
        relative_url: ``, //probably use a constant and extract from there
        name: '', //doesn't always have
        headers: {}
       }
    })})
    .then((response) => {console.log(response);})
    .catch((err) => {console.log(err);})
  },
}

module.exports = Facebook
