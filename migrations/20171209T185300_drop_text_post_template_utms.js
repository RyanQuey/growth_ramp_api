exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('postTemplates', function (t) {
      t.dropColumns('mediumUtm', 'sourceUtm', 'contentUtm', 'customUtm', 'termUtm');
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('postTemplates', function (t) {
      t.text('mediumUtm');
      t.text('sourceUtm');
      t.text('contentUtm');
      t.text('termUtm');
      t.text('customUtm');
    })
  ])

};
