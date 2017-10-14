
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('messages', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('thumbnailUrl');
      t.text('mediumUtm');
      t.text('sourceUtm');
      t.text('contentUtm');
      t.text('termUtm');
      t.text('customUtm');
      //associations
      t.integer('userId').references('id').inTable('users');
      t.integer('postId').references('id').inTable('posts');
      t.integer('providerAccountId').references('id').inTable('providerAccounts');
      t.integer('planId').references('id').inTable('plans');
    }),
    knex.schema.createTable('plans', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('name');
      t.text('status');
      t.json('channelConfigurations');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());
      //associations
      t.integer('userId').references('id').inTable('users');
    }),
    knex.schema.createTable('posts', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('status');
      //associations
      t.integer('userId').references('id').inTable('users');
      t.integer('planId').references('id').inTable('plans');
    }),
    knex.schema.createTable('providerAccounts', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('provider');
      t.text('userName');
      t.text('providerUserId')
      t.text('email');
      t.text('profilePictureUrl');
      t.text('status');
      t.json('channels');
      t.text('accessToken');
      t.dateTime('accessTokenExpires')
      t.text('refreshToken');
      t.dateTime('refreshTokenExpires')
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());
      //associations
      t.integer('userId').references('id').inTable('users');
    }),
    knex.schema.createTable('users', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('email');
      t.text('phone');
      t.text('firstName');
      t.text('lastName');
      t.text('apiToken');
      t.text('password');
      t.boolean('welcomeEmailSent');
      t.dateTime('apiTokenExpires');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());
      //associations
    }),

    //joins tables
    knex.schema.createTable('provider_accounts_plans', function (t) {
      t.integer('providerAccountId').references('id').inTable('providerAccounts');
      t.integer('planId').references('id').inTable('plans');
    }),
    knex.schema.createTable('provider_accounts_messages', function (t) {
      t.integer('providerAccountId').references('id').inTable('providerAccounts');
      t.integer('messageId').references('id').inTable('messages');
    }),
    knex.schema.createTable('provider_accounts_posts', function (t) {
      t.integer('providerAccountId').references('id').inTable('providerAccounts');
      t.integer('postId').references('id').inTable('posts');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.raw('DROP TABLE if exists messages cascade'),
    knex.raw('DROP TABLE if exists plans cascade'),
    knex.raw('DROP TABLE if exists posts cascade'),
    knex.raw('DROP TABLE if exists providerAccounts cascade'),
    knex.raw('DROP TABLE if exists users cascade'),
    knex.raw('DROP TABLE if exists provider_accounts_plans cascade'),
    knex.raw('DROP TABLE if exists provider_accounts_messages cascade'),
    knex.raw('DROP TABLE if exists provider_accounts_posts cascade'),
  ])

};
