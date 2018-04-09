
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('users', function (t) {
      t.dropColumn('hideCompletedAuditItems');
      t.json('settings');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('users', function (t) {
      t.boolean('hideCompletedAuditItems');
      t.dropColumn('settings');
    }),
  ])
};
