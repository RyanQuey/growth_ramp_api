
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('accountSubscriptions', function (t) {
      t.text('subscriptionStatus');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('accountSubscriptions', function (t) {
      t.dropColumn('subscriptionStatus');
    }),
  ])

};
