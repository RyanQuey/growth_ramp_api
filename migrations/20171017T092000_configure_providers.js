
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('providerAccounts', function (t) {
      t.json('scope'),
      t.json('potentialChannels')
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('providerAccounts', function (t) {
      t.dropColumns('scope', 'potentialChannels')
    })
  ])

};
