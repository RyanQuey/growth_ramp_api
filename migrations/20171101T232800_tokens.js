
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('tokens', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('action');
      t.text('objectId');
      t.datetime('expires');
      t.text('token');
      t.boolean('valid');
      //associations
      t.integer('userId').references('id').inTable('users');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.raw('DROP TABLE if exists tokens cascade'),
  ])
};
