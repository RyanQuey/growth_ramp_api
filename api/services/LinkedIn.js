//just doing rest for LinkedIn, SDK doesn't support mobile and no library looks good enough to have another dependency
//this also gives me greater flexibility

const axios = require('axios')
//might create sep lib for li if need to use this stuff elsewhere
axios.defaults.baseUrl = "https://api.linkedin.com/v1"
axios.defaults.headers.common['x-li-format'] = 'json'

const LinkedIn = {
  createPost: (account, channel, post, utms) => {
    return new Promise((resolve, reject) => {
//if was going to supply all of these; but we'd rather they get them from teh post itself
/*      const body = {
        "comment": `${post.text} , //"Check out developer.linkedin.com!", //this is the main post body.
        "content": {
          //"title": post.contentTitle, //"LinkedIn Developers Resources", //the title of the shared article
          //"description": post.contentDescription, //"Leverage LinkedIn's APIs to maximize engagement", //description of the shared article
          "submitted-url": `${post.contentUrl}?${utms}`, //other urls can be in the comment, but LI will only analyze the first one for content to share
          "submitted-image-url": post.uploadedContent[0].url
        },
        "visibility": {
          "code": post.visibility || "connections-only" //"anyone" or "connections-only"
        }
      }*/

      const body = {
        "comment": `${post.text} ${post.contentUrl}?${utms}`, //"Check out developer.linkedin.com!", //this is the main post body.
        //not sure if this will get sent...
        "content": {
          "submitted-image-url": post.uploadedContent[0].url
        },
        "visibility": {
          "code": post.visibility || "connections-only" //"anyone" or "connections-only"
        }
      }

      LinkedIn[PERSONAL_POST](body)
      .then((response) => {
        const {updateKey, updateUrl} = response
        //perhaps persist these if we want the user to be able to look at the link or update it
        //TODO
        return resolve(response)
      })
      .catch((err) => {
        console.log(err);
        return reject(err)
      })
    })
  },

  PERSONAL_POST: (body) => {
    const path = `/people/~/shares?format=json`

    return axios.post(path, body)
  },

//TODO set to page...
  PAGE_POST: (body) => {
    const path = `/people/~/shares?format=json`

    return axios.post(path, body)
  },

//TODO set to group...
//LinkedIn deprecated this
/*  GROUP_POST: (post, utms) => {
    return axios.post(path, body)
  },
*/
}

module.exports = LinkedIn
