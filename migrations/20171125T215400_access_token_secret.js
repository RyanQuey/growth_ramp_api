
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('providerAccounts', function (t) {
      t.text('accessTokenSecret');
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('providerAccounts', function (t) {
      t.dropColumn('accessTokenSecret');
    })
  ])

};
