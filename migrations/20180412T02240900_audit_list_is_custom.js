
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('auditLists', function (t) {
      t.boolean('isCustomList');
      t.text('name');
      t.text('description');
      t.json('metricFilters');
      t.json('validityMetricFilters');
      t.json('dimensions');
      t.json('orderBys');
      t.integer('customListId').references('id').inTable('customLists');
    }),
    knex.schema.table('customLists', function (t) {
      t.text('description');
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('auditLists', function (t) {
      t.dropColumn('isCustomList');
      t.dropColumn('name');
      t.dropColumn('metricFilters');
      t.dropColumn('validityMetricFilters');
      t.dropColumn('dimensions');
      t.dropColumn('orderBys');
      t.dropColumn('description');
      t.dropColumn('customListId');
    }),
    knex.schema.table('customLists', function (t) {
      t.dropColumn('description');
    })
  ])
};
