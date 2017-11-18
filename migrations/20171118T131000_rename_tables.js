
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.renameTable('posts', 'campaigns'),
    knex.schema.renameTable('messages', 'posts'),
    knex.schema.renameTable('messageTemplates', 'postTemplates')
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.renameTable('posts', 'messages'),
    knex.schema.renameTable('postTemplates', 'messageTemplates'),
    knex.schema.renameTable('campaigns', 'posts')
  ])

};
