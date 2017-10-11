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
    status: { type: 'string', required: true, enum: PLAN_STATUSES },
    channelConfigurations: { type: 'json', defaultsTo: {} },
      /*
        type: { type: 'string', required: true },//"PERSONAL_POST",
        defaultMediumUtm: { type: 'string' },
        defaultSourceUtm: { type: 'string' },
        defaultContentUtm: { type: 'string' },
        defaultTermUtm: { type: 'string' },
        defaultCustomUtm: { type: 'string' },
        active: { type: 'boolean', defaultsTo: true },
      */

    //Association
    userId: {
      model: 'users',
      required: true,
    }, //will be the userid, until it is populated (.populate('user'))

    providers: {//(necessary to toggle entire providers without messing up channel configurations)
      collection: 'providers',
      via: 'plans',
      dominant: true
    },

    posts: {
      collection: 'posts',
      via: 'planId'
    },
    messages: {
      collection: 'messages',
      via: 'plans',
      through: 'posts'
    },
  },
  autoCreatedAt: true,
  autoUpdatedAt: true,
//I wonder if this will collide with knex
};

