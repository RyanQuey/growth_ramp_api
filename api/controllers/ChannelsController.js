/**
 * ChannelsController
 *
 * @description :: Server-side logic for managing Channels
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const blueprints = require('../blueprints');
module.exports = {

  find: (req, res) => {
    return blueprints.find(req, res);
  },
};

