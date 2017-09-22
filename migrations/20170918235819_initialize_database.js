
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('messages', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.string('thumbnailUrl');
      t.string('mediumUtm');
      t.string('sourceUtm');
      t.string('contentUtm');
      t.string('termUtm');
      t.string('customUtm');
      //associations
      t.integer('userId').references('id').inTable('users');
      t.integer('postId').references('id').inTable('posts');
      t.integer('providerId').references('id').inTable('providers');
      t.integer('planId').references('id').inTable('plans');
    }),
    knex.schema.createTable('plans', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.string('name');
      t.string('status');
      t.json('channelConfigurations');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());
      //associations
      t.integer('userId').references('id').inTable('users');
    }),
    knex.schema.createTable('posts', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.string('status');
      //associations
      t.integer('userId').references('id').inTable('users');
      t.integer('planId').references('id').inTable('plans');
    }),
    knex.schema.createTable('providers', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.string('name');
      t.string('userName');
      t.string('email');
      t.string('profilePictureUrl');
      t.string('status');
      t.json('channels');
      t.string('accessToken');
      t.dateTime('accessTokenExpires')
      t.string('refreshToken');
      t.dateTime('refreshTokenExpires')
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());
      //associations
      t.integer('userId').references('id').inTable('users');
    }),
    knex.schema.createTable('users', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.string('email');
      t.string('phone');
      t.string('firstName');
      t.string('lastName');
      t.string('apiToken');
      t.string('password');
      t.boolean('welcomeEmailSent');
      t.dateTime('apiTokenExpires');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());
      //associations
    }),

    //joins tables
    knex.schema.createTable('providers_plans', function (t) {
      t.integer('providerId').references('id').inTable('providers');
      t.integer('planId').references('id').inTable('plans');
    }),
    knex.schema.createTable('providers_messages', function (t) {
      t.integer('providerId').references('id').inTable('providers');
      t.integer('messageId').references('id').inTable('messages');
    }),
    knex.schema.createTable('providers_posts', function (t) {
      t.integer('providerId').references('id').inTable('providers');
      t.integer('postId').references('id').inTable('posts');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.raw('DROP TABLE if exists messages cascade'),
    knex.raw('DROP TABLE if exists plans cascade'),
    knex.raw('DROP TABLE if exists posts cascade'),
    knex.raw('DROP TABLE if exists providers cascade'),
    knex.raw('DROP TABLE if exists users cascade'),
    knex.raw('DROP TABLE if exists providers_plans cascade'),
    knex.raw('DROP TABLE if exists providers_messages cascade'),
    knex.raw('DROP TABLE if exists providers_posts cascade'),
  ])

};
