
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('workgroups', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('name');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());
      //associations
      t.integer('ownerId').references('id').inTable('users');
    }),
    knex.schema.createTable('permissions', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('access');
      t.boolean('active');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());
      //associations
      t.integer('userId').references('id').inTable('users');
      t.integer('workgroupId').references('id').inTable('workgroups');
      t.integer('planId').references('id').inTable('users');
      t.integer('providerAccountId').references('id').inTable('providerAccounts');
    }),

    //joins tables
    //not sure if this one is right...
    knex.schema.createTable('workgroups_members__memberships_workgroups', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.integer('workgroupId').references('id').inTable('workgroups');
      t.integer('memberId').references('id').inTable('users');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());
    }),
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.raw('DROP TABLE if exists workgroups cascade'),
    knex.raw('DROP TABLE if exists permissions cascade'),
    knex.raw('DROP TABLE if exists workgroups_members__memberships_workgroups cascade'),
  ])

};
