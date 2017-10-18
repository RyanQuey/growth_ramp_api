
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('posts', function (t) {
      t.renameColumn('timePublished', 'publishedAt')
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('posts', function (t) {
      t.renameColumn('publishedAt', 'timePublished')
    })
  ])

};
