
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('providerAccounts', function (t) {
      t.text('photoUrl')
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('providerAccounts', function (t) {
      t.dropColumns('photoUrl')
    })
  ])
};
