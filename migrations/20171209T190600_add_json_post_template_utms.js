exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('postTemplates', function (t) {
      t.json('mediumUtm');
      t.json('sourceUtm');
      t.json('contentUtm');
      t.json('termUtm');
      t.json('customUtm');
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('postTemplates', function (t) {
      t.dropColumns('mediumUtm', 'sourceUtm', 'contentUtm', 'customUtm', 'termUtm');
    })
  ])

};
