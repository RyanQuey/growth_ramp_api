const Analytics = {

  // get info for all google analytics accounts for all Google accounts this user has
  getAllGAAccounts: (user) => {
    return new Promise((resolve, reject) => {
      //get all real Google accounts for user
      ProviderAccounts.find({
        userId: user.id,
        provider: "GOOGLE",
      })
      .then((accounts) => {
        // just manually filtering for now; basically just as fast (can't imagine there will ever be a lot of accounts to filter
        const promises = accounts.filter((a) => !a.unsupportedProvider).map((account) => {
          return GoogleAnalytics.getAccountSummaries(account)
        }) || []

        //will be array of arrays of analytics accounts, one array of analytics accts / google provider acct
        return resolve(Promise.all(promises))
      })
      .catch((err) => {
        reject(err)
      })
    })
  },

  //wrapper around GoogleAnalytics.getReport currently, until other analytics apis are added
  getAnalytics: (user, params) => {
    return new Promise((resolve, reject) => {
      let filters = params.filters
      //happens if coming from a GET query string
      if (typeof filters === "string") {
        filters = JSON.parse(filters)
      }

      let analyticsProfile
      ProviderAccounts.findOne({
        userId: user.id,
        id: filters.providerAccountId,
      })
      .then((account) => {
        return GoogleAnalytics.getReport(account, filters)
      })
      .then((result) => {
        return resolve(result)
      })
      .catch((err) => {
        if (err.code) {
          switch (err.code) {
            case "no-rows-for-profile":
            console.error("User: ", user.id, "ProfileId: ", filters.profileId, "WebsiteID: ", filters.websiteId);
          }
        }
        return reject(err)
      })
    })
  }
}
module.exports = Analytics
