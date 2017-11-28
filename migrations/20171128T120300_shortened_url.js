
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('posts', function (t) {
      t.text('shortUrl');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('posts', function (t) {
      t.dropColumn('shortUrl');
    })
  ])

};
