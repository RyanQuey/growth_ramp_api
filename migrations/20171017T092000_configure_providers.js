
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('providerAccounts', function (t) {
      t.json('scopes'),
      t.json('potentialChannels')
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('providerAccounts', function (t) {
      t.dropColumns('scopes', 'potentialChannels')
    })
  ])

};
