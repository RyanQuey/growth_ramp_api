/**
 * ChannelsController
 *
 * @description :: Server-side logic for managing Channels
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  find: (req, res) => {
    return blueprints.find(req, res);
  },
};

