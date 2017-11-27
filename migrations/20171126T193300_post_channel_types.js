
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('postTemplates', function (t) {
      t.renameColumn('channel', 'channelType');
      t.text('channelId');
    }),
    knex.schema.table('posts', function (t) {
      t.renameColumn('channel', 'channelType');
      t.text('channelId');
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('postTemplates', function (t) {
      t.renameColumn('channelType', 'channel');
      t.dropColumn('channelId');
    }),
    knex.schema.table('posts', function (t) {
      t.renameColumn('channelType', 'channel');
      t.dropColumn('channelId');
    })
  ])

};
