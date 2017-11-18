/**
 * Plan.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
import { PLAN_STATUSES } from "../constants"

module.exports = {

  attributes: {
    name: { type: 'string', required: true }, //"e.g., my favorite plan"
    status: { type: 'string', required: true, enum: PLAN_STATUSES, defaultsTo: PLAN_STATUSES[0]  },
    //messages does put the channel info on first level, so can query there. No reason to make the data readily accessible/normalized here in plans, where a plan can change constantly, and data can just be retrieved from the messages
    channelConfigurations: { type: 'json', defaultsTo: {} }, //is just if each provider and each account for the provider is disabled or not for this plan (for UI)

      //previously:
      //don't set a default object; want this to scale to many providers, so don't want to have to set this enormous default. Instead, handle on creation
      //will group this with keys being providers, so:
      /*
       * FACEBOOK: {
       *   //account settings for this plan
       *   accounts: { //keeps channels from getting to nested, while still allowing for configuring accounts
       *     [account.id]: {
       *       enabled: Boolean
       *     },
       *     ...
       *   },
       *   //keep this format very similar to messages for simplicity's sake. the idea is that this plan will send one message per channel configuration
       *   //I don't imagine that there will be terribly large amount of channels for a given plan either, so just sort in browser
       * },
       * TWITTER: {...
      */

    //Associations
    userId: {
      model: 'users',
      required: true,
    }, //will be the userid, until it is populated (.populate('user'))
    postTemplates: {
      collection: 'postTemplates',
      via: 'planId',
    },

    /*providerAccounts: {//(necessary to toggle entire providerAccounts without messing up channel configurations...edit: actually, not really, channelConfigurations is json, so can put settings there)
      collection: 'providerAccounts',
      via: 'plans',
      dominant: true
    },*/

    campaigns: {
      collection: 'campaigns',
      via: 'planId'
    },
    posts: {
      collection: 'posts',
      via: 'planId',
    },
    permissions: {
      collection: 'permissions',
      via: 'planId'
    },
  },
  autoCreatedAt: true,
  autoUpdatedAt: true,


};

