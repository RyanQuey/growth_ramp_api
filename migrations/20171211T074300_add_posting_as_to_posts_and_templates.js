exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('posts', function (t) {
      t.text('postingAs');
    }),
    knex.schema.table('postTemplates', function (t) {
      t.text('postingAs');
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('posts', function (t) {
      t.dropColumns('postingAs');
    }),
    knex.schema.table('postTemplates', function (t) {
      t.dropColumns('postingAs');
    })
  ])

};
