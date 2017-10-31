/**
 * PostController
 *
 * @description :: Server-side logic for managing posts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  publish: (req, res) => {
    Posts.publish(req.body)
    .then((results) => {
      res.ok(results)
    })
    .catch((err) => {res.badRequest(err)})
  },
};

