exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('messages', function (t) {
      t.text('text');
      t.text('channel');
      t.text('messageUrl');
      t.text('messageKey');
      t.text('visibility');
      t.text('contentTitle');
      t.text('contentDescription');
      t.text('contentUrl');
      t.text('campaignUtm');
      t.integer('messageTemplateId').references('id').inTable('messageTemplates');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('messages', function (t) {
      t.dropColumns('text', 'channel', 'messageUrl', 'messageKey', 'visibility', 'contentTitle', 'contentDescription', 'contentUrl', 'messageTemplateId', 'campaignUtm')
    }),
  ])
};

