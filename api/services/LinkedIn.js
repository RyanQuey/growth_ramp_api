//just doing rest for LinkedIn, SDK doesn't support mobile and no library looks good enough to have another dependency
//this also gives me greater flexibility
//node-linkedin would be the one though if I did use one
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

      LinkedIn[post.channelType](post, body, axiosLI)
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

  PERSONAL_POST: (post, body, axiosLI) => {
    return axiosLI.post(`${LIApi}/v1/people/~/shares?format=json`, body)
  },

//TODO set to page...
  // these are business pages
  PAGE_POST: (post, body, axiosLI, ) => {
    //not supporting this yet
    //body["share-target-reach"] = {"share-targets": }
    return axiosLI.post(`${LIApi}/v1/companies/${post.channelId}/shares?format=json`, body)


  },

  //channelType should be PAGE_POST or GROUP_POST
  getChannels: (account, channelType, pagination) => {
    return new Promise((resolve, reject) => {
      const axiosLI = _setup(account)

      let path
      //gets converted to query string in axios
      let params = {
        start: pagination.start || 0,
        count: pagination.count || 25, //maximum to return
        //format: "json"
      }

      //currently is the only channelType...
      if (channelType === "PAGE_POST") {
        path = "companies" //Facebook pages this person is admin for
        //leave this off to get all pages they are a part of?
        params["is-company-admin"] = "true"

      }


      axiosLI(`${LIApi}/v1/${path}?format=json`, {params} )
      .then((channels) => {
        console.log(channels);
      })
      .catch((err) => {
        console.log("Error getting ", channelType);
        console.log(err.response);
        if (Helpers.safeDataPath(err, "response.data.message", false) === "Member is restricted") {
          console.log("User's account is restricted");
        }
        return reject(Helpers.safeDataPath(err, "response.data", err))
      })
    })
  },


//TODO set to group...
//LinkedIn deprecated this
//https://www.linkedin.com/help/linkedin/answer/81635/groups-api-no-longer-available?lang=en
/*  GROUP_POST: (post, utms) => {
    return axios.post(path, body)
  },
*/
}

module.exports = LinkedIn
