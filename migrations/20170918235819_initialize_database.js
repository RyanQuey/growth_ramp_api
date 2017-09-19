
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('messages', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.string('thumbnail_url');
      t.string('medium_utm');
      t.string('source_utm');
      t.string('content_utm');
      t.string('term_utm');
      t.string('custom_utm');
      //associations
      t.integer('user_id').references('id').inTable('users');
      t.integer('post_id').references('id').inTable('posts');
      t.integer('provider_id').references('id').inTable('providers');
      t.integer('plan_id').references('id').inTable('plans');
    }),
    knex.schema.createTable('plans', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.string('name');
      t.string('status');
      t.json('channel_configurations');
      t.timestamps();//createdAt, updatedAt
      //associations
      t.integer('user_id').references('id').inTable('users');
    }),
    knex.schema.createTable('posts', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.string('status');
      //associations
      t.integer('user_id').references('id').inTable('users');
      t.integer('plan_id').references('id').inTable('plans');
    }),
    knex.schema.createTable('providers', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.string('name');
      t.string('user_name');
      t.string('email');
      t.string('profile_picture_url');
      t.string('status');
      t.json('channels');
      t.string('access_token');
      t.dateTime('access_token_expires')
      t.string('refresh_token');
      t.dateTime('refresh_token_expires')
      t.timestamps();//createdAt, updatedAt
      //associations
      t.integer('user_id').references('id').inTable('users');
    }),
    knex.schema.createTable('users', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.string('email');
      t.string('first_name');
      t.string('last_name');
      t.string('api_token');
      t.string('password');
      t.boolean('welcome_email_sent');
      t.dateTime('api_token_expires')
      t.timestamps();//createdAt, updatedAt
      //associations
    }),

    //joins tables
    knex.schema.createTable('providers_plans', function (t) {
      t.integer('provider_id').references('id').inTable('providers');
      t.integer('plan_id').references('id').inTable('plans');
    }),
    knex.schema.createTable('providers_messages', function (t) {
      t.integer('provider_id').references('id').inTable('providers');
      t.integer('message_id').references('id').inTable('messages');
    }),
    knex.schema.createTable('providers_posts', function (t) {
      t.integer('provider_id').references('id').inTable('providers');
      t.integer('post_id').references('id').inTable('posts');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable('messages'),
    knex.schema.dropTable('plans'),
    knex.schema.dropTable('posts'),
    knex.schema.dropTable('providers'),
    knex.schema.dropTable('users'),
    knex.schema.dropTable('providers_plans'),
    knex.schema.dropTable('providers_messages'),
    knex.schema.dropTable('providers_posts'),
  ])

};
