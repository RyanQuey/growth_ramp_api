
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('posts', function (t) {
      t.dateTime('timePublished')
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('posts', function (t) {
      t.dropColumns('timePublished', 'createdAt', 'updatedAt')
    })
  ])

};
