
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('messageTemplates', function (t) {
      t.text('status');
      t.text('campaignUtm');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('messageTemplates', function (t) {
      t.dropColumns('status', 'campaignUtm')
    }),
  ])
};
