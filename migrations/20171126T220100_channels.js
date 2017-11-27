
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('channels', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('providerChannelId');
      t.text('name');
      t.text('provider'); //should be identical to the providerAccount provider
      t.text('accessToken');
      t.boolean('sharingAllowed');
      t.dateTime('accessTokenExpires');
      t.text('type');
      t.json('userPermissions');
      t.json('otherInfo');  //catchall for random stuff
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());
      //associations
      t.integer('providerAccountId').references('id').inTable('providerAccounts');
      t.integer('userId').references('id').inTable('users');
    }),
    knex.schema.table('postTemplates', function (t) {
      t.text('provider'); //should be identical to the providerAccount provider
    }),
    knex.schema.table('posts', function (t) {
      t.text('provider'); //should be identical to the providerAccount provider
    }),
    knex.schema.table('providerAccounts', function (t) {
      t.dropColumn('channels');
      t.dropColumn('potentialChannels');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.raw('DROP TABLE if exists channels cascade'),
    knex.schema.table('postTemplates', function (t) {
      t.dropColumn('provider'); //should be identical to the providerAccount provider
    }),
    knex.schema.table('posts', function (t) {
      t.dropColumn('provider'); //should be identical to the providerAccount provider
    }),
    knex.schema.table('providerAccounts', function (t) {
      t.json('channels');
      t.json('potentialChannels');
    }),
  ])

};
