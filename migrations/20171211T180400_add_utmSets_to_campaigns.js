exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('campaigns', function (t) {
      t.json('utmSets');
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('campaigns', function (t) {
      t.dropColumns('utmSets');
    })
  ])

};
