
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('channels', function (t) {
      t.text('forumName')
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('channels', function (t) {
      t.dropColumn('forumName')
    }),
  ])
};
