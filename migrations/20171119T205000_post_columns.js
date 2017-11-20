
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('posts', function (t) {
      t.dropColumn('contentTitle');
      t.dropColumn('contentDescription');
      t.dropColumn('thumbnailUrl');
      t.json('uploadedContent');
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('posts', function (t) {
      t.text('contentTitle');
      t.text('contentDescription');
      t.text('thumbnailUrl');
      t.dropColumn('uploadedContent');
    })
  ])

};
