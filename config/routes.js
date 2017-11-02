/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `api/responses/notFound.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.org/#!/documentation/concepts/Routes/RouteTargetSyntax.html
 */

module.exports.routes = {
  //I think you can call next to pass the request along to the next route that matches
  '/test': function (req, res, next) {
    res.send("successfully contacted the API")
  },

  ////////////////////////////////////////////////////////////////
  //users

  //logging in with Token instance or credentials
  'post /users/authenticate': {
    controller: 'UsersController',
    action: 'authenticate'
  },

  //logging in, or also probably when linking a new provider account
  'post /users/login_with_provider': {
    controller: 'UsersController',
    action: 'loginWithProvider'
  },

  //when logging in or restoring session from the cookie
  'get /users/:id/initialUserData': {
    controller: 'UsersController',
    action: 'initialUserData'
  },

  //fetching user posts
  'get /users/:id/posts': {
    controller: 'UsersController',
    action: 'getPosts'
  },

  'post /users/resetPassword': {
    controller: 'UsersController',
    action: 'resetPassword'
  },

  'post /users/signOut': {
    controller: 'UsersController',
    action: 'signOut'
  },

  ////////////////////////////////////////////////////////////////
  //posts
  //

  'post /posts/:id/publish': {
    controller: 'PostsController',
    action: 'publish'
  },

  ////////////////////////////////////////////////////////////////
  //providers
  //will set a tentative new record, with scopes set and provider name and user id
  //if confirmed, at that point can either connect to an existing account (if there is a match) or, if provider userId does not match, that is the new account
  //if cancelled, all of that user's pending accounts for that provider are destroyed (because, I have no way of telling which
  'put /providers/:providerName/tentativelySetScope': {
    controller: 'UsersController',
    action: 'signOut'
  },


  ////////////////////////////////////////////////////////////////
  //tokens

  'post /tokens/:token/useToken': {
    controller: 'TokensController',
    action: 'useToken'
  },


  /***************************************************************************
  *                                                                          *
  * Custom routes here...                                                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the custom routes above, it   *
  * is matched against Sails route blueprints. See `config/blueprints.js`    *
  * for configuration options and examples.                                  *
  *                                                                          *
  ***************************************************************************/

};
