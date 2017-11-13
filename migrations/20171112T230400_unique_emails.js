
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.alterTable('users', function (t) {
      t.unique('email')
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.alterTable('users', function (t) {
      t.dropUnique('email')
    }),
  ])
};
