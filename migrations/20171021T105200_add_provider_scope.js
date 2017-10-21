
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('providerAccounts', function (t) {
      t.json('scopes')
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('providerAccounts', function (t) {
      t.dropColumn('scopes')
    })
  ])

};
