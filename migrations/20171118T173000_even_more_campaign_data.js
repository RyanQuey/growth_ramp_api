
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('campaigns', function (t) {
      t.text('contentUrl')
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('campaigns', function (t) {
      t.dropColumn('contentUrl')
    })
  ])

};
