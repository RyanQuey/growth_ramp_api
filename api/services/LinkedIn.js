//just doing rest for LinkedIn, SDK doesn't support mobile and no library looks good enough to have another dependency
//this also gives me greater flexibility
//node-linkedin would be the one though if I did use one

//NOTE: Doesn't allow refreshing access tokens; must prompt relogin
//https://developer.linkedin.com/docs/oauth2

const LIApi = "https://api.linkedin.com"
//NOTE don't get accessToken from account record; that is encrypted still
const _setup = (account, accessToken) => {
console.log("access token", accessToken);
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
        console.log("Failure publishing to LinkedIn:");
        console.log(err.response.data || err);
        return reject(LinkedIn.handleError(err, null, body))
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
  getChannels: (account, channelType, pagination, accessTokenData) => {
    return new Promise((resolve, reject) => {
      const axiosLI = _setup(account, accessTokenData.accessToken)

      let path

      //total found so far
      let total = 0
      //where last search started from
      let lastSearchStart
      //where the next search will start from
      let start = pagination.start || 0
      //what the next search's results count should be (what we're asking for
      let count = pagination.count || 100 //maximum to return. Their docs say max is 100
      //will hold all the accumulated channels
      let totalChannelsForType = []
      let keepSearching = true

      //will be called multiple times if they have many channels
      const doIt = () => {
        return new Promise((resolve, reject) => {

          //gets converted to query string in axios
          let params = {
            start: start,
            count: count,
            //format: "json"
          }

          //currently is the only channelType...
          if (channelType === "PAGE_POST") {
            path = "companies" //Facebook pages this person is admin for
            //leave this off to get all pages they are a part of?
            params["is-company-admin"] = "true"
          }

          return axiosLI(`${LIApi}/v1/${path}?format=json`, {params} )
          .then((result) => {
            console.log(result && result.data || result || "No results returned");
            const channelsData = result.data.values || []//in case no hits are found, return empty array
            const channelsFound = channelsData.map((channel) => (
              {
                providerChannelId: channel.id,
                name: channel.name,
                sharingAllowed: true, //li might return this; might want to get it from them
              }
            ));
            //prepare to be persisted
            totalChannelsForType.concat(channelsFound)

            //prepare for requesting next page
            total = result.data._total
            start = totalChannelsForType.length - 1//maybe use result.data._count?? Note though, first record is start 0

            //if didn't return any OR current found is same as total, stop looping. Hopefully the last conditions are unnecessary (?) (if total is less than where we would start searching, OR if didn't get anywhere
            if (!result.data._count || total === start || total < start || lastSearchStart === start) {
              return resolve()

            } else {
              return doIt()
            }
          })
          .catch((err) => {
            return reject(err)
          })
        })
      }


      doIt()
      .then(() => {
        return resolve(totalChannelsForType)
      })
      .catch((err) => {
        console.log("Error getting ", channelType);
        console.log(err && err.response && err.response);
        return reject(LinkedIn.handleError(err))
      })
    })
  },

  //https://developer.linkedin.com/docs/guide/v2/error-handling
  handleError: (err, code = false, body) => {

    code = code || Helpers.safeDataPath(err, `response.data.status`, false)

    //this will be returned to the front end, which will handle depending on the code
    //there will be response.data unless error is...our fault..
    let ret = {code: "", originalError: Helpers.safeDataPath(err, "response.data", err)}

  //TODO test
    switch (code) {
      case 400: //bad request; probably malformed syntax in url or body
        console.log("Failing params for linked in", body );
        ret.code = 'bad-request'
        break
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
