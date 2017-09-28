/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

import { PROVIDER_STATUSES, PROVIDERS } from "../constants"

module.exports = {
  //TODO: if the asynchronous stuff gets too complicated, try async lib, which is placed as a global in sails by default

	loginWithProvider: ((req, res) => {
    console.log("beginning to login with provider");
    Providers.loginWithProvider(req)
    .then((user) => {
console.log(user);
      //eventually need to build up the provider information with this
      return res.ok(user)
    })
    .catch((err) => {
      console.log(err);
      return res.negotiate(err)
    })

  }),

  addProvider: ((req, res) => {

  //1) verify user via token
  //2) create or update provider information
  //3) update the provider tokens, basically part of 2
  //4) return user info, along with plans and posts and API token, to the client server

    //
    //.then((user) => {
    //req.user should already be set by the API token policy
      console.log(req.user);
    /*})
    .catch((err) => {
      console.log(err);
    })*/

  }),
};

