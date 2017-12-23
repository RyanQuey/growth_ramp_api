
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('postTemplates', function (t) {
      t.dropColumn('channelId');
    }),
    knex.schema.table('posts', function (t) {
      t.dropColumn('channelId');
    })
  ])
  .then(() => {
    return Promise.all([
      knex.schema.table('postTemplates', function (t) {
        t.integer('channelId').references('id').inTable('channels');
      }),
      knex.schema.table('posts', function (t) {
        t.integer('channelId').references('id').inTable('channels');
      })
    ])
  })
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('postTemplates', function (t) {
      t.dropColumn('channelId');
    }),
    knex.schema.table('posts', function (t) {
      t.dropColumn('channelId');
    })
  ])
  .then(() => {
    return Promise.all([
      knex.schema.table('postTemplates', function (t) {
        t.integer('channelId');
        t.integer('channelId').references('id').inTable('channels');
      }),
      knex.schema.table('posts', function (t) {
        t.integer('channelId');
        t.integer('channelId').references('id').inTable('channels');
      })
    ])
  })
};
