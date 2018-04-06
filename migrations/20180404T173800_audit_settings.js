
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('websites', function (t) { //settings for a particular website
      t.json('weeklyMinimums');
      t.json('monthlyMinimums');
      t.json('quarterlyMinimums');
      t.json('yearlyMinimums');
    }),
    knex.schema.table('workgroups', function (t) {
      t.boolean('hideFixedAuditItems');
    }),
    knex.schema.table('users', function (t) {
      t.boolean('hideFixedAuditItems');
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('workgroups', function (t) {
      t.dropColumn('hideFixedAuditItems');
    }),
    knex.schema.table('websites', function (t) {
      t.dropColumn('weeklyMinimums');
      t.dropColumn('monthlyMinimums');
      t.dropColumn('quarterlyMinimums');
      t.dropColumn('yearlyMinimums');
    }),
    knex.schema.table('users', function (t) {
      t.dropColumn('hideFixedAuditItems');
    }),

  ])
};
