//just doing rest for LinkedIn, SDK doesn't support mobile and no library looks good enough to have another dependency
//this also gives me greater flexibility

const axios = require('axios')
//might create sep lib for li if need to use this stuff elsewhere
axios.defaults.baseUrl = "https://api.linkedin.com/v1"
axios.defaults.headers.common['x-li-format'] = 'json'

module.exports = {
  createPost: (data) => {
    const path = ``
    const body = {
      "comment": data.message.text, //"Check out developer.linkedin.com!", //this is the main message body.
      "content": {
        "title": data.message.contentTitle, //"LinkedIn Developers Resources", //the title of the shared article
        "description": data.message.contentDescription, //"Leverage LinkedIn's APIs to maximize engagement", //description of the shared article
        "submitted-url": `${data.message.contentUrl}?${data.utms.join("& or use querystring js")}`, //other urls can be in the comment, but LI will only analyze the first one for content to share
        "submitted-image-url": "https://example.com/logo.png"
      },
      "visibility": {
        "code": data.message.visibility//"anyone" or "connections-only"
      }
    }

    axios.post(path, body)
    .then((response) => {
      const {updateKey, updateUrl} = response
      //perhaps persist these if we want the user to be able to look at the link or update it
    })
    .catch((err) => {
      console.log(err);
    })
  },
}
