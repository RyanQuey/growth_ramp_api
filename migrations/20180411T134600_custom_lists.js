
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('customLists', function (t) { //make a separate record per profile, if they want to link multiple profiles
      t.increments('id').primary() //auto incrementing IDs
      t.text('status');
      t.text('name');
      t.text('testKey');
      t.json('metricFilters');
      t.json('validityMetricFilters');
      t.json('dimensions');
      t.json('orderBys');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());

      //associations
      t.integer('userId').references('id').inTable('users');
      t.integer('websiteId').references('id').inTable('websites');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable('customLists'),
  ])
};
