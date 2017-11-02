
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('notifications', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('identifier');
      t.text('method');
      t.boolean('sent');
      t.text('subject');
      t.text('body');
      t.text('plainTextMessage');
      t.text('addresses');
      t.text('from');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());
      //associations
      t.integer('userId').references('id').inTable('users');
    }),
    knex.schema.table('users', function (t) {
      t.boolean('emailConfirmed');
      t.datetime('emailConfirmedAt');
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.raw('DROP TABLE if exists notifications cascade'),
    knex.schema.table('users', function (t) {
      t.dropColumns('emailConfirmed', 'emailConfirmedAt');
    })
  ])
};
