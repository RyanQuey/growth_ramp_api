
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('accountSubscriptions', function (t) {
      t.increments('id').primary() //auto incrementing IDs
      t.text('status');
      t.text('subscriptionFor');
      t.text('stripeCustomerId');
      t.text('stripeSubscriptionId');
      t.text('paymentPlan');
      t.text('currency');
      t.text('defaultSourceId');
      t.timestamp('currentPeriodEnd');
      t.timestamp('currentPeriodStart');
      t.timestamp('cancelledAt');
      t.timestamp('endedAt');
      t.boolean('cancelAtPeriodEnd');
      t.timestamp('createdAt').defaultTo(knex.fn.now());
      t.timestamp('updatedAt').defaultTo(knex.fn.now());

      //associations
      t.integer('userId').references('id').inTable('users');
      t.integer('workgroupId').references('id').inTable('workgroups');
    }),
    knex.schema.table('workgroups', function (t) {
      t.integer('accountSubscriptionId').references('id').inTable('accountSubscriptions');
    }),
    knex.schema.table('users', function (t) {
      t.integer('accountSubscriptionId').references('id').inTable('accountSubscriptions');
    }),

  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.raw('DROP TABLE if exists accountSubscriptions cascade'),
    knex.schema.table('workgroups', function (t) {
      t.dropColumn('accountSubscriptionId');
    }),
    knex.schema.table('users', function (t) {
      t.dropColumn('accountSubscriptionId');
    }),
  ])

};
