
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('auditLists', function (t) {
      t.text('archiveReason');
    }),
    knex.schema.table('auditListItems', function (t) {
      t.text('archiveReason');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('auditLists', function (t) {
      t.dropColumn('archiveReason');
    }),
    knex.schema.table('auditListItems', function (t) {
      t.dropColumn('archiveReason');
    })
  ])
};
