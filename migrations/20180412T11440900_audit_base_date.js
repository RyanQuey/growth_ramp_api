
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('audits', function (t) {
      t.date('baseDate');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('audits', function (t) {
      t.dropColumn('baseDate');
    })
  ])
};
