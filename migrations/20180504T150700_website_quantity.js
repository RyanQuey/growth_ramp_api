
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('accountSubscriptions', function (t) {
      t.integer('websiteQuantity');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('accountSubscriptions', function (t) {
      t.dropColumn('websiteQuantity');
    })
  ])
};
