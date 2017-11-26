//just doing rest for LinkedIn, SDK doesn't support mobile and no library looks good enough to have another dependency
//this also gives me greater flexibility
const LIApi = "https://api.linkedin.com"
const _setup = (account) => {
  const axiosLI = axios.create({
      headers: {
        'x-li-format': 'json',
        'Authorization': `Bearer ${account.accessToken}`
      }
  })

  return axiosLI
}

const LinkedIn = {
  createPost: (account, post, utms) => {
    return new Promise((resolve, reject) => {
      const axiosLI = _setup(account)
      //might create sep lib for li if need to use this stuff elsewhere

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
        "comment": post.text, //"Check out developer.linkedin.com!", //this is the main post body.
        //not sure if this will get sent...
        "content": {
          "submitted-image-url": post.uploadedContent[0].url,
          "submitted-url": `${post.contentUrl}?${utms}`, //other urls can be in the comment, but LI will only analyze the first one for content to share
        },
        "visibility": {
          "code": post.visibility || "connections-only" //"anyone" or "connections-only"
        }
      }

      LinkedIn[post.channel](body, axiosLI)
      .then((response) => {
        const {updateKey, updateUrl} = response
        //perhaps persist these if we want the user to be able to look at the link or update it
        //TODO
        return resolve({postUrl: updateUrl, postKey: updateKey})
      })
      .catch((err) => {
        console.log(err);
        return reject(err)
      })
    })
  },

  PERSONAL_POST: (body, axiosLI) => {
    return axiosLI.post(`${LIApi}/v1/people/~/shares?format=json`, body)
  },

//TODO set to page...
  PAGE_POST: (body, axiosLI) => {
    return axiosLI.post(`${LIApi}/v1/people/~/shares?format=json`, body)
  },

//TODO set to group...
//LinkedIn deprecated this
/*  GROUP_POST: (post, utms) => {
    return axios.post(path, body)
  },
*/
}

module.exports = LinkedIn
