
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('messageTemplates', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('thumbnailUrl');
      t.text('mediumUtm');
      t.text('sourceUtm');
      t.text('contentUtm');
      t.text('termUtm');
      t.text('customUtm');
      t.text('channel');
      t.text('messageUrl');
      t.text('messageKey');
      t.text('visibility');
      t.text('contentTitle');
      t.text('contentDescription');
      //associations
      t.integer('userId').references('id').inTable('users');
      t.integer('postId').references('id').inTable('posts');
      t.integer('providerAccountId').references('id').inTable('providerAccounts');
      t.integer('planId').references('id').inTable('plans');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.raw('DROP TABLE if exists messageTemplates cascade'),
  ])
};
