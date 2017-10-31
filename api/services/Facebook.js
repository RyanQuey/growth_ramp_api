const FB = require('fb')

const _setup = (account) => {
  const fb = new FB.Facebook({
    //this lib automatically adds the app secret key
    appId: process.env.CLIENT_FACEBOOK_KEY,
    appSecret: process.env.CLIENT_FACEBOOK_SECRET,
    accessToken: account.accessToken,
    version: 'v2.10',
    timeout_ms: 60*1000,
  })

  return fb
}

module.exports = {
  //all the posts for one user account
  //not sure if this responds with a promise like the others do ?
  //if not, just have a call back
  batchRequest: (message, account, options = {}) => {
    fb = _setup(account)
    fb.api('', 'post', {batch: message.batch.map((post) => {

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
