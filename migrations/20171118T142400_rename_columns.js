
exports.up = function(knex, Promise) {
  return Promise.all([
    //formerly messages
    knex.schema.table('posts', function (t) {
      t.renameColumn('messageUrl', 'postUrl'),
      t.renameColumn('messageKey', 'postKey'),
      t.dropColumn('postId'),
      t.integer('campaignId').references('id').inTable('campaigns'),
      t.dropColumn('messageTemplateId'),
      t.integer('postTemplateId').references('id').inTable('postTemplates')
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('posts', function (t) {
      t.renameColumn('postUrl', 'messageUrl'),
      t.renameColumn('postKey', 'messageKey'),
      t.dropColumn('campaignId'),
      t.integer('postId').references('id').inTable('posts'),
      t.dropColumn('postTemplateId'),
      t.integer('messageTemplateId').references('id').inTable('messageTemplates')
    })
  ])

};
