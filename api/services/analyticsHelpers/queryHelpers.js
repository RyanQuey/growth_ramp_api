// general helpers for generating queries
const queryHelpers = {
  // Google analytics uses bare bones http url and with no subdomain for its property
  // GSC uses https (if applicable) and can be with subdomain
  // for now, will automatically guess the GSC siteUrl from the GA property, though later might let them choose what GA property defaults to what gsc siteURL
  // keep in sync with frontend
  getGSCUrlFromGAUrl: (gaUrl, gscSites) => {
    const parsedUrl = urlLib.parse(gaUrl)
    const hostname = parsedUrl.hostname
    const parts = hostname.split(".")

    //take only the last two parts to get TLD and no subdomain
    const tld = parts.pop()
    const domain = parts.pop()

    const gscUrls = Object.keys(gscSites)

    let matches = gscUrls.filter(url => url.includes(domain))

    let match
    if (matches.length === 1) {
      match = matches[0]

    } else if (matches.length === 0) {
      return //nothing for now

    } else if (matches.length > 1) {
      let closerMatches = gscUrls.filter(url => url.includes(`${domain}.${tld}`))

      if (closerMatches.length === 1) {
        match = closerMatches[0]

      } else if (closerMatches.length === 0) {
        return matches[0]

      } else if (closerMatches.length > 1) {
        match = closerMatches[0]

      }
    }
  },

  // takes dataset string and parses to get relevant data
  // keep in sync with frontend helper
  parseDataset: (dataset) => {
    const datasetParts = dataset.split("-")
    const displayType = datasetParts[0]

    let rowsBy, columnSetsArr, xAxisBy, specifyingTestBy, testGroup, testKeys
    if (displayType === "table") {
      rowsBy = datasetParts[1] || ""
      const columnSetsStr = datasetParts[2] || ""
      columnSetsArr = columnSetsStr.split(",") || []

    } else if (displayType === "chart") {
      xAxisBy = datasetParts[1] || ""
    } else if (displayType === "contentAudit") {
      specifyingTestBy = datasetParts[1]// "testGroup", "testKey"

      if (specifyingTestBy === "testGroup") {
        //"all", "nonGoals", "goals". For now not doing "all". Will probably do more later
        testGroup = datasetParts[2]

      } else if (specifyingTestBy === "testKeys") {
        // accepts array of test keys to run
        testKeys = datasetParts[2]
      }
    }

    return {datasetParts, displayType, rowsBy, xAxisBy, columnSetsArr, specifyingTestBy, testGroup, testKeys}
  },

  // takes dataset info and returns which api will be requested
  // keep in sync with frontend helper
  whomToAsk: (dataset) => {
    const {datasetParts, displayType, rowsBy, xAxisBy, columnSetsArr} = queryHelpers.parseDataset(dataset)
    const ret = []

    if (displayType === "table") {
      if (!rowsBy.includes("keyword")) {
        ret.push("GoogleAnalytics")
      } else {
        ret.push("GoogleSearchConsole")
      }

    } else if (displayType === "chart") {
      if (!xAxisBy.includes("keyword")) {
        ret.push("GoogleAnalytics")
      } else {
        // TODO fix for gsc. For now, just continue to show GA data
        //ret.push("GoogleSearchConsole")
      }
    }

    return ret
  },
}

module.exports = queryHelpers
