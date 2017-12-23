/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your controllers.
 * You can apply one or more policies to a given controller, or protect
 * its actions individually.
 *
 * Any policy file (e.g. `api/policies/authenticated.js`) can be accessed
 * below by its filename, minus the extension, (e.g. "authenticated")
 *
 * For more information on how policies work, see:
 * http://sailsjs.org/#!/documentation/concepts/Policies
 *
 * For more information on configuring policies, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.policies.html
 */


module.exports.policies = {

  /***************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions (`true` allows public     *
  * access)                                                                  *
  *                                                                          *
  ***************************************************************************/

  //by default, nothing is allowed once this is uncommented (recommended best practice)
  '*': false,

  /* disabling until v2
 * PermissionsController: {
    create: ['userTokenAuth', 'canWrite'],
    update: ['userTokenAuth', 'canWrite'],
    //some say you cannot do a policy with findOne (?), though others disagree. if this is true, just apply canRead to the rest of the actions
    find: ['userTokenAuth', 'canRead'],
    findOne: ['userTokenAuth', 'canRead'],
    //eventually will set controller actions for this for the resources
    //changePermissions: ['canChangePermissions'],
  },*/
  CampaignsController: {
    create: ['userTokenAuth', 'canWrite'],
    update: ['userTokenAuth', 'canWrite'],
    //some say you cannot do a policy with findOne (?), though others disagree. if this is true, just apply canRead to the rest of the actions
    find: ['userTokenAuth', 'canRead'],
    findOne: ['userTokenAuth', 'canRead'],
    publish: ['userTokenAuth', 'canWrite'],
    //eventually will set controller actions for this for the resources
    //changePermissions: ['canChangePermissions'],
    getAnalytics: ['userTokenAuth', 'canRead'],
  },
  NotificationsController: {
    //they need user id for this to work
    contactUs: ['userTokenAuth', 'canWrite'],
  },
  PlansController: {
    create: ['userTokenAuth', 'canWrite'],
    createFromCampaign: ['userTokenAuth', 'canWrite'],
    update: ['userTokenAuth', 'canWrite'],
    //some say you cannot do a policy with findOne (?), though others disagree. if this is true, just apply canRead to the rest of the actions
    find: ['userTokenAuth', 'canRead'],
    findOne: ['userTokenAuth', 'canRead'],
    fetchPopulatedPlan: ['userTokenAuth', 'canRead'],
    //eventually will set controller actions for this for the resources
    //changePermissions: ['userTokenAuth', 'canChangePermissions'],
  },
  PostsController: {
    create: ['userTokenAuth', 'canWrite'],
    update: ['userTokenAuth', 'canWrite'],
    destroy: ['userTokenAuth', 'canWrite'],
    //some say you cannot do a policy with findOne (?), though others disagree. if this is true, just apply canRead to the rest of the actions
    find: ['userTokenAuth', 'canRead'],
    findOne: ['userTokenAuth', 'canRead'],
    //eventually will set controller actions for this for the resources
    //changePermissions: ['canChangePermissions'],
  },
  PostTemplatesController: {
    create: ['userTokenAuth', 'canWrite'],
    update: ['userTokenAuth', 'canWrite'],
    destroy: ['userTokenAuth', 'canWrite'],
    //some say you cannot do a policy with findOne (?), though others disagree. if this is true, just apply canRead to the rest of the actions
    find: ['userTokenAuth', 'canRead'],
    findOne: ['userTokenAuth', 'canRead'],
    //eventually will set controller actions for this for the resources
    //changePermissions: ['canChangePermissions'],
  },
  ProviderAccountsController: {
    refreshChannelType: ['userTokenAuth'],
    find: ['userTokenAuth', 'canRead'],
  },
  TokensController: {
    //create: ['userTokenAuth', 'canWrite'],
    //update: ['userTokenAuth', 'canWrite'],
    //some say you cannot do a policy with findOne (?), though others disagree. if this is true, just apply canRead to the rest of the actions
    find: ['userTokenAuth', 'canRead'],
    findOne: ['userTokenAuth', 'canRead'],
    useToken: ['userTokenAuth'],
    //need one for the login token
  },
  UsersController: {
    create: true,
    authenticate: true,
    update: ['userTokenAuth', 'canWrite'],
    //some say you cannot do a policy with findOne (?), though others disagree. if this is true, just apply canRead to the rest of the actions
    find: ['userTokenAuth', 'canRead'],
    findOne: ['userTokenAuth', 'canRead'],
    loginWithProvider: ['userTokenAuth', 'checkProviderData'],
    initialUserData: ['userTokenAuth', 'canRead'],
    populate: ['userTokenAuth', 'canRead'],
    getCampaigns: ['userTokenAuth', 'canRead'],
    resetPassword: true,
    signOut: ['userTokenAuth'],
    //eventually will set controller actions for this for the resources
    //changePermissions: ['userTokenAuth', 'canChangePermissions'],
  },
/* disabling until v2
  WorkgroupsController: {
    create: ['userTokenAuth', 'canWrite'],
    update: ['userTokenAuth', 'canWrite'],
    //some say you cannot do a policy with findOne (?), though others disagree. if this is true, just apply canRead to the rest of the actions
    find: ['userTokenAuth'],  //will only retrieve the user's groups
    findOne: ['userTokenAuth', 'canRead'],
    //eventually will set controller actions for this for the resources
    //changePermissions: ['canChangePermissions'],
  },
    */

  /***************************************************************************
  *                                                                          *
  * Here's an example of mapping some policies to run before a controller    *
  * and its actions                                                          *
  *                                                                          *
  ***************************************************************************/
	// RabbitController: {

		// Apply the `false` policy as the default for all of RabbitController's actions
		// (`false` prevents all access, which ensures that nothing bad happens to our rabbits)
		// '*': false,

		// For the action `nurture`, apply the 'isRabbitMother' policy
		// (this overrides `false` above)
		// nurture	: 'isRabbitMother',

		// Apply the `isNiceToAnimals` AND `hasRabbitFood` policies
		// before letting any users feed our rabbits
		// feed : ['isNiceToAnimals', 'hasRabbitFood']
	// }
};
