//just doing rest for LinkedIn, SDK doesn't support mobile and no library looks good enough to have another dependency
//this also gives me greater flexibility
//node-linkedin would be the one though if I did use one

//NOTE: Doesn't allow refreshing access tokens; must prompt relogin
//https://developer.linkedin.com/docs/oauth2

const LIApi = "https://api.linkedin.com"
//NOTE don't get accessToken from account record; that is encrypted still
const _setup = (account, accessToken) => {
  const axiosLI = axios.create({
      headers: {
        'x-li-format': 'json',
        'Authorization': `Bearer ${accessToken}`
      }
  })

  return axiosLI
}

const LinkedIn = {
  createPost: (account, post, channel, accessTokenData) => {
    return new Promise((resolve, reject) => {
      const axiosLI = _setup(account, accessTokenData.accessToken)
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

      //only allowing one image for LI
      const imageUrl = Helpers.safeDataPath(post, "uploadedContent.0.url", "")

      const body = {
        comment: post.text, //"Check out developer.linkedin.com!", //this is the main post body.
        visibility: {
          code: post.visibility || "anyone" //"anyone" or "connections-only"
        }
      }

      //if a property but blank, LI raises error
      if (post.shortUrl || imageUrl) {
        body.content = {}
        if (post.shortUrl) body.content["submitted-url"] = post.shortUrl //other urls can be in the comment, but LI will only analyze the first one for content to share
        if (imageUrl) body.content["submitted-image-url"] = imageUrl //other urls can be in the comment, but LI will only analyze the first one for content to share
      }

      LinkedIn[post.channelType](post, body, channel, axiosLI)
      .then((response) => {
        console.log("Successfully posted to LI");
        const {updateKey, updateUrl} = response
        //perhaps persist these if we want the user to be able to look at the link or update it
        //TODO actually get these
        return resolve({postUrl: updateUrl, postKey: updateKey})
      })
      .catch((err) => {
        console.log("Failure from publishing to LinkedIn:");
        console.log(err.response.data || err);
        return reject(LinkedIn.handleError(err))
      })
    })
  },

  PERSONAL_POST: (post, body, channel, axiosLI) => {
    return axiosLI.post(`${LIApi}/v1/people/~/shares?format=json`, body)
  },

//TODO set to page...
  // these are business pages
  PAGE_POST: (post, body, channel, axiosLI, ) => {
    //not supporting this yet
    //body["share-target-reach"] = {"share-targets": }
    return axiosLI.post(`${LIApi}/v1/companies/${channel.providerChannelId}/shares?format=json`, body)
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
      .then((result) => {
        console.log(result.data);
        const total = result.data._total
        const pages = result.data.values || []//in case no hits are found, return empty array
        //prepare to be persisted
        const channelsForType = pages.map((channel) => (
          {
            providerChannelId: channel.id,
            name: channel.name,
            sharingAllowed: true, //li might return this; might want to get it from them
          }
        ));

        return resolve(channelsForType)
      })
      .catch((err) => {
        console.log("Error getting ", channelType);
        console.log(err.response);
        return reject(LinkedIn.handleError(err))
      })
    })
  },

  //https://developer.linkedin.com/docs/guide/v2/error-handling
  handleError: (err, code = false) => {

    code = code || Helpers.safeDataPath(err, `response.data.status`, false)

    //this will be returned to the front end, which will handle depending on the code
    let ret = {code: "", originalError: err}

    switch (code) {
      case 401:
        // they removed permissions, or access token expired
        // this shouldn't publish
        ret.code = 'require-reauthorization'
        break
      case 403:
        // they never gave us this scope...
        // should never get here, but here it is
        // this shouldn't publish
        ret.code = 'insufficient-permissions'
        break
      case 429:
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
//TODO set to group...
//LinkedIn deprecated this
//https://www.linkedin.com/help/linkedin/answer/81635/groups-api-no-longer-available?lang=en
/*  GROUP_POST: (post) => {
    return axios.post(path, body)
  },
*/
}

module.exports = LinkedIn
