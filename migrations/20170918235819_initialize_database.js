
exports.up = function(knex, Promise) {
  knex.schema.createTable('users', function (table) {
    table.increments() //auto incrementing IDs
    table.string('email');
    table.string('firstName');
    table.string('lastName');
    table.timestamps();//createdAt, updatedAt

};

exports.down = function(knex, Promise) {

};
