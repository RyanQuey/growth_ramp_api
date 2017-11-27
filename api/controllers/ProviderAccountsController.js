/**
 * ProviderController
 *
 * @description :: Server-side logic for managing providers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  refreshChannelType: (req, res) => {
    const accountId = req.params.accountId;
console.log(req.body.channelType, accountId);

    const channelType = req.body.channelType;
console.log(channelType);

    ProviderAccounts.findOne(accountId)//.populate('channels')
    .then((account) => {
      if (account.userId !== req.user.id) {
        return res.forbidden()
      } else if (!account) {
        return res.badRequest()
      }

      return ProviderAccounts.refreshChannelType(account, channelType)
    })
    .then((result) => {
      return res.ok(result)
    })
    .catch((err) => {
      console.log("failure refreshing channel type");
      return res.negotiate(err)
    })
  },

};

