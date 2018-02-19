const Analytics = {

  //for a given user, get all of their analytics accounts (GA, GSC...add more later?)
  getAllAccounts: (user) => {
    return new Promise((resolve, reject) => {
      ProviderAccounts.find({
        userId: user.id,
        provider: "GOOGLE",
      })
      .then((accounts) => {
        //get all real Google accounts for user
        // just manually filtering for now; basically just as fast (can't imagine there will ever be a lot of accounts to filter
        const googleAccounts = accounts.filter((a) => !a.unsupportedProvider)
        const promises = [
          GoogleAnalytics.getAllGAAccounts(googleAccounts),
          GoogleSearchConsole.getAllGSCAccounts(googleAccounts)
        ]
        return Promise.all(promises)
      })
      .then(([gaAccounts, gscAccounts]) => {
        return resolve({gaAccounts, gscAccounts})
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
        return GoogleAnalytics.getReport(account, filters, {dataset: params.dataset})
      })
      .then((result) => {
        return resolve(result)
      })
      .catch((err) => {
        if (err.code) { //codes GR made
          switch (err.code) {
            case "no-rows-for-profile":
              console.error("User: ", user.id, "ProfileId: ", filters.profileId, "WebsiteID: ", filters.websiteId);
              break
            default:
              console.error("Error from getting analytics: ", err);
          }
        } else {
          console.error("Error from getting analytics: ", err);
        }

        return reject(err)
      })
    })
  }
}
module.exports = Analytics
