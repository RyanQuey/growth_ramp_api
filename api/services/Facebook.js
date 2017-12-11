const FB = require('fb')
const appId = process.env.CLIENT_FACEBOOK_KEY || sails.config.env.CLIENT_FACEBOOK_KEY
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
      //right now, only posting as page for PAGE_POSTS; no individual posts
      if (options.postAsPage || post.channelType === "PAGE_POST") {
        accessTokenToUse = channel.accessToken
      } else {
        accessTokenToUse = accessTokenData.accessToken
      }
      const fb = _setup(account, accessTokenToUse)
      const body = `${post.text} ${post.shortUrl}`

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

console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
        return Facebook[post.channelType](post, body, channel, fb, uploadsData )
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
        return reject(err)
      })

    })
  },


  PERSONAL_POST: (post, body, channel, fb, uploadsData) => {
console.log("333333333333333333333333333333########");
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
    return fb.api('me/feed', 'post', params)
    .then((data) => {
console.log("result from Facebook");
console.log(data);

        return {postKey: data.id}
    })
  },

//TODO set to page...
  PAGE_POST: (post, body, channel, fb, uploadsData, options = {}) => {
    let params = {
      message: body,
      //channel.access_token, unneeded for just making posts
    }
    if (uploadsData) {
      for (let i = 0; i < uploadsData.length; i++) {
        let upload = uploadsData[i]
        let key = `attached_media[${i}]`
        params[key] = JSON.stringify({media_fbid: upload.mediaId})
      }
    }

    return new Promise((resolve, reject) => {
      //right now, only posting as page
      if (options.postAsPage || true) {
        return resolve(fb.api(`${channel.providerChannelId}/feed`, 'post', params))

      } else {
        //posting as individual
        //TODO use a diff endpoint, for individuals...because the way I'm doing it, I don't think it is officially supported
        return resolve(fb.api(`${channel.providerChannelId}/feed`, 'post', params))

      }
    })
    .then((data) => {
      console.log("result from Facebook");
      console.log(data);
      return {postKey: data.id}
    })
  },

//TODO set to group...
  GROUP_POST: (post, body, channel, fb, uploadsData) => {
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
    return fb.api(`${channel.providerChannelId}/feed`, 'post', params)
    .then((data) => {
      console.log("result from Facebook");
      console.log(data);

      return {postKey: data.id}
    })
//TODO extract out response data here, so can be returned correctly whether or not uploading stuff
//will extract out different things depending on the channel anyway, so this is best
  },

  //all the posts for one user account
  //not sure if this responds with a promise like the others do ?
  //if not, just have a call back
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
        return reject(err)
      })
    })
  },

  //trade short-lived access token for long one.
  //NOTE this is not refreshing using refresh token
  //https://developers.facebook.com/docs/facebook-login/access-tokens/expiration-and-extension
  //passport explicitly doesn't do this
  //https://github.com/jaredhanson/passport-facebook/issues/98
  handleOauthData: (oauthData) => {
    const shortLivedAccessToken = oauthData.accessToken
    //should never happen. But if it does, let the caller handle it.
    if (!shortLivedAccessToken) {return Promise.resolve(oauthData)}

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
      return resolve(data)
    })
    .catch((err) => {
      console.log(err);
      return reject(err)
    })
  },

}

module.exports = Facebook
