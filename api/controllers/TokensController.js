/**
 * TokensController
 *
 * @description :: Server-side logic for managing Tokens
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  //TODO need to go through all of the situations
  useToken: function(req, res){
    Tokens.processToken(req.params.token, req.user)
    .then((result) => {
      //in case token is needed in browser
      res.ok(result)
    })
    .catch((err) => {
      console.log(err);
      res.badRequest(err)
    })
  },
};

