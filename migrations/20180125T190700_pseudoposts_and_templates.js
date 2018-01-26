
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('posts', function (t) {
      t.boolean('pseudopost');
    }),
    knex.schema.table('postTemplates', function (t) {
      t.boolean('pseudopost');
    }),
    knex.schema.table('providerAccounts', function (t) {
      t.boolean('unsupportedProvider');
    }),
    knex.schema.table('channels', function (t) {
      t.boolean('unsupportedChannel')
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('posts', function (t) {
      t.dropColumn('pseudopost');
    }),
    knex.schema.table('postTemplates', function (t) {
      t.dropColumn('pseudopost');
    }),
    knex.schema.table('providerAccounts', function (t) {
      t.dropColumn('unsupportedProvider');
    }),
    knex.schema.table('channels', function (t) {
      t.dropColumn('unsupportedChannel')
    }),
  ])
};
