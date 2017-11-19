
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('campaigns', function (t) {
      t.json('promotedContent'),
      t.text('name')
    }),
    knex.schema.table('posts', function (t) {
      t.dateTime('publishedAt'),
      t.dateTime('delayedUntil')
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('campaigns', function (t) {
      t.dropColumn('promotedContent'),
      t.dropColumn('name')
    }),
    knex.schema.table('posts', function (t) {
      t.dropColumn('publishedAt'),
      t.dropColumn('delayedUntil')
    })
  ])

};
