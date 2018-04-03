
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('websites', function (t) { //make a separate record per profile, if they want to link multiple profiles
      t.increments('id').primary() //auto incrementing IDs
      t.text('status');
      t.text('name');
      t.text('gaLevel');
      t.text('externalGaAccountId');
      t.text('gaWebPropertyId');
      t.text('gaProfileId');
      t.text('gscSiteUrl');
      t.text('gscPermissionLevel');
      t.text('gaSiteUrl');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());

      //associations
      t.integer('userId').references('id').inTable('users');
      t.integer('googleAccountId').references('id').inTable('providerAccounts');
    }),
    knex.schema.createTable('audits', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('status');
      t.text('dataset');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());

      //associations
      t.integer('userId').references('id').inTable('users');
      t.integer('websiteId').references('id').inTable('websites');
      t.integer('googleAccountId').references('id').inTable('providerAccounts');
    }),
    knex.schema.createTable('auditLists', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('status');
      t.text('testKey');
      t.text('listKey');
      t.date('startDate');
      t.date('endDate');
      t.json('summaryData');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());

      //associations
      t.integer('userId').references('id').inTable('users');
      t.integer('websiteId').references('id').inTable('websites');
      t.integer('auditId').references('id').inTable('audits');
    }),

    knex.schema.createTable('auditListItems', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('status');
      t.text('dimension');
      t.json('metrics');
      t.text('listKey'); //saving here too, so can easily grab items from same list
      t.boolean('fixed');
      t.timestamp('fixedAt');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());

      //associations
      t.integer('userId').references('id').inTable('users');
      t.integer('websiteId').references('id').inTable('websites');
      t.integer('auditId').references('id').inTable('audits');
      t.integer('auditListId').references('id').inTable('auditLists');
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable('websites'),
    knex.raw('DROP TABLE audits cascade'),
    knex.raw('DROP TABLE if exists "auditLists" cascade'),
    knex.schema.dropTableIfExists('auditListItems'),
  ])
};
