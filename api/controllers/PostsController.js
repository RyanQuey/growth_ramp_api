/**
 * PostController
 *
 * @description :: Server-side logic for managing messages
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  find: (req, res) => {
    return blueprints.find(req, res);
  },
};

