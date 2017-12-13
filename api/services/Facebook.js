const FB = require('fb')
const appId = process.env.CLIENT_FACEBOOK_ID || sails.config.env.CLIENT_FACEBOOK_ID
const appSecret = process.env.CLIENT_FACEBOOK_SECRET || sails.config.env.CLIENT_FACEBOOK_SECRET

//NOTE don't get accessToken from account record; that is encrypted still
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

const Facebook = {
  createPost: (account, post, channel, accessTokenData, options = {}) => {
    return new Promise((resolve, reject) => {
      let accessTokenToUse
console.log("post", post);
      if (post.postingAs === "PAGE") {
        accessTokenToUse = channel.accessToken

      } else {
        accessTokenToUse = accessTokenData.accessToken
      }
      const fb = _setup(account, accessTokenToUse)
//      const body =
      const body = {
        message: `${post.text ? post.text + " " : ""}${post.shortUrl || ""}`,
        link: post.shortUrl,
      }

      if (post.uploadedContent && post.uploadedContent.length ) {
        return resolve(Facebook._uploadAndPost(post, body, channel, fb))
      } else {
        return resolve(Facebook[post.channelType](post, body, channel, fb, false))
      }
    })
  },

  //upload the files and then create post
  _uploadAndPost: (post, body, channel, fb) => {
    return new Promise((resolve, reject) => {
      // Note: You can also do this yourself manually using T.post() calls if you want more fine-grained
      // // control over the streaming. Example: https://github.com/ttezel/twit/blob/master/tests/rest_chunked_upload.js#L20
      const uploads = post.uploadedContent.map((c) => c.url)
      const channelId = channel && channel.providerChannelId || "me"
      const promises = uploads.map((url) => Facebook._upload(url, channel.providerChannelId, fb))

      Promise.all(promises)
      //these are successful uploads
      .then((uploadsData) => {

        return resolve(Facebook[post.channelType](post, body, channel, fb, uploadsData ))
      })
    })
  },

  //upload a file
  _upload: (url, channelId = "me", fb, options = {}) => {
    return new Promise((resolve, reject) => {
      // Note: You can also do this yourself manually using T.post() calls if you want more fine-grained
      // // control over the streaming. Example: https://github.com/ttezel/twit/blob/master/tests/rest_chunked_upload.js#L20
      let channelPath = channelId//can be groupId, eventId, pageId instead. Or "me" === fb UserId

      // VIDEOS would be at `me/videos` or whatever the channelType is
      fb.api(`${channelPath}/photos`, 'post', {
        url: url,
        published: false //to not publish to wall, but still upload content, which remains for 24 hours ONLY unless gets published then. Gets published when post does.
      }) //can add a caption
      .then((response) => {
         //if published, returns a post_id too, of the post the photo is published in
        const mediaId = response.id
        //not doing this yet
        const metaParams = {
          mediaId,
        }
        return resolve(metaParams)
      })
      .catch((err) => {
        console.log("FAILED_TO_UPLOAD");
        return reject(Facebook.handleError(err))
      })

    })
  },


  PERSONAL_POST: (post, body, channel, fb, uploadsData) => {
    return new Promise((resolve, reject) => {
      let params = {
        message: body.message,
        link: body.link,
      }
      if (uploadsData) {
        for (let i = 0; i < uploadsData.length; i++) {
          let upload = uploadsData[i]
          let key = `attached_media[${i}]`
          params[key] = JSON.stringify({media_fbid: upload.mediaId})
        }
      }
      fb.api('me/feed', 'post', params)
      .then((data) => {
        console.log("result from Facebook");
        console.log(data);

        return resolve({postKey: data.id})
      })
      .catch((err) => {
        return reject(Facebook.handleError(err))
      })
    })
  },

  PAGE_POST: (post, body, channel, fb, uploadsData) => {
    return new Promise((resolve, reject) => {
      let params = {
        message: body.message,
        link: body.link,
      }
      if (uploadsData) {
        for (let i = 0; i < uploadsData.length; i++) {
          let upload = uploadsData[i]
          let key = `attached_media[${i}]`
          params[key] = JSON.stringify({media_fbid: upload.mediaId})
        }
      }

      //could make this a promise, but no need
      const postIt = () => {
        if (post.postingAs === "PAGE") {
          return fb.api(`${channel.providerChannelId}/feed`, 'post', params)
        } else if (post.postingAs === "SELF") {
          //TODO use a diff endpoint, for individuals...because the way I'm doing it, I don't think it is officially supported
          return fb.api(`${channel.providerChannelId}/feed`, 'post', params)
        }
      }

      postIt()
      .then((data) => {
        console.log("result from Facebook");
        console.log(data);
        return resolve({postKey: data.id})
      })
      .catch((err) => {
        return reject(Facebook.handleError(err))
      })
    })
  },

//TODO set to group...
  GROUP_POST: (post, body, channel, fb, uploadsData) => {
    return new Promise((resolve, reject) => {
      let params = {
        message: body.message,
        link: body.link,
      }
      if (uploadsData) {
        for (let i = 0; i < uploadsData.length; i++) {
          let upload = uploadsData[i]
          let key = `attached_media[${i}]`
          params[key] = JSON.stringify({media_fbid: upload.mediaId})
        }
      }

      fb.api(`${channel.providerChannelId}/feed`, 'post', params)
      .then((data) => {
        console.log("result from Facebook");
        console.log(data);

        return resolve({postKey: data.id})
      })
      .catch((err) => {
        return reject(Facebook.handleError(err))
      })
    })
  },

  //all the posts for one user account
  //not sure if this responds with a promise like the others do ?
  //if not, just have a call back
  /*
  batchRequest: (post, account, options = {}) => {
    const fb = _setup(account)
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

  */

  //channelType should be PAGE_POST or GROUP_POST
  getChannels: (account, channelType, pagination) => {
    return new Promise((resolve, reject) => {
      const fb = _setup(account)

      let path
      let params = {}

      if (channelType === "PAGE_POST") {
        path = "accounts" //Facebook pages this person is admin for

      } else if ("GROUP_POST") {
        path = "groups" //Facebook pages this person is admin for

      }

      fb.api(`me/${path}`, {params})
      .then((results) => {
        const pagination = results.paging //TODO will have to use eventually

        //prepare to be persisted
        const channelsForType = results.data.map((channel) => (
          {
            providerChannelId: channel.id,
            name: channel.name,
            sharingAllowed: true, //li might return this; might want to get it from them
            accessToken: channel.access_token, //fb provides for pages only
            otherInfo: {
              category: channel.category, //fb provides for pages only,
              privacy: channel.privacy, //fb returns this
            },
            userPermissions: channel.perms, //fb provides for pages only. What permissions the user has for this page
          }
        ));
        return resolve(channelsForType)
      })
      .catch((err) => {
        console.log("Error getting ", channelType);
        console.log(err);

        return reject(Facebook.handleError(err))
      })
    })
  },

  //trade short-lived access token for long one.
  //NOTE this is not refreshing using refresh token
  //https://developers.facebook.com/docs/facebook-login/access-tokens/expiration-and-extension
  //passport explicitly doesn't do this
  //https://github.com/jaredhanson/passport-facebook/issues/98
  handleOauthData: (oauthData) => {
    return new Promise((resolve, reject) => {
      const shortLivedAccessToken = oauthData.accessToken
      if (shortLivedAccessToken === null) {}
      //should never happen unles purposely removing access token. But if it does, let the caller handle it.
      if (!shortLivedAccessToken) {return resolve(oauthData)}

      FB.api('oauth/access_token', {
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'fb_exchange_token',
        fb_exchange_token: shortLivedAccessToken
      })
      .then((data) => {
        const longLivedAccessToken = data.access_token

        //their current default...but let's just hope they return it
        //but not the end of the world if we estimate wrong anyways
        const accessTokenExpires = data.expires || moment.utc().add(60, "days").format()

        const ret = Object.assign({}, oauthData, {
          accessToken: longLivedAccessToken,
          accessTokenExpires,
        })
        return resolve(ret)
      })
      .catch((err) => {
        console.log("FAILURE_HANDLING_DATA", err);
        console.log("Just sending short lived access token back");
        //just pass through the old data
        return resolve(oauthData)
      })
    })
  },

  handleError: (err, code = false) => {
    code = code || Helpers.safeDataPath(err, `response.error.code`, false)

    //this will be returned to the front end, which will handle depending on the code
    let ret = {code: "", originalError: err}

    switch (true) {
      case (code == 190):
        // they removed permissions, or access token expired
        // this shouldn't publish
        ret.code = 'require-reauthorization'
        break
      case (code > 199 && code < 300):
        // this is for failed scopes
        // this shouldn't publish
        ret.code = 'insufficient-permissions'
        break
      //4 means GR did too many; 17 means user
      case (code === 4 || code === 17):
        // this shouldn't publish
        ret.code = 'rate-limit-reached'
        break

      case (code === 506):
        // this shouldn't publish
        ret.code = 'duplicate-post'
        break
      default:
        ret.code = 'unknown-error-while-publishing'
        break
    }

    return ret
  },
}

module.exports = Facebook
