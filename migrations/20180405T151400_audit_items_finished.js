
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('users', function (t) {
      t.dropColumn('hideFixedAuditItems');
      t.boolean('hideCompletedAuditItems');
    }),
    knex.schema.table('auditListItems', function (t) {
      t.dropColumn('fixed');
      t.dropColumn('fixedAt');
      t.boolean('completed');
      t.timestamp('completedAt');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('users', function (t) {
      t.boolean('hideFixedAuditItems');
      t.dropColumn('hideCompletedAuditItems');
    }),
    knex.schema.table('auditListItems', function (t) {
      t.dropColumn('completed');
      t.dropColumn('completedAt');
      t.boolean('fixed');
      t.timestamp('fixedAt');
    })
  ])
};
