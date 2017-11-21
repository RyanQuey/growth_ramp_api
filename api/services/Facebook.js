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
  createPost: (account, channel, post, utms) => {
    return new Promise((resolve, reject) => {
      fb = _setup(account)
      const body = post.text

      Facebook[channel](post, utms)
      .then((response) => {
console.log("Facebook response");
        const {updateKey, updateUrl} = response
        //perhaps persist these if we want the user to be able to look at the link or update it
        //TODO
        return resolve(response)
      })
      .catch((err) => {
        console.log(err, err && err.response);
        return reject(err)
      })
    })
  },

  PERSONAL_POST: (post, utms) => {
    return fb.api('me/feed', 'post', {message: body})
  },

//TODO set to page...
  PAGE_POST: (post, utms) => {
    return fb.api('me/feed', 'post', {message: body})
  },

//TODO set to group...
  GROUP_POST: (post, utms) => {
    return fb.api('me/feed', 'post', {message: body})
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
