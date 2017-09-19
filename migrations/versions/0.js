var NODE_ENV = process.env.NODE_ENV || 'development';
var Migration = require('../_migration.js');
var fs = require('fs');
var path = require('path');
const knex = require("knex");

module.exports = class InitializeDatabase extends Migration {
  constructor (...args) {
    super(...args);
    this.name = 'Initialize Database';
  }

  /*check () {
    return  this.client.query('SELECT "externalId" FROM Spots LIMIT 1');
  }*/

  up () {
    //this.noSettings = false
    //return this.client.query('ALTER TABLE Spots ADD COLUMN "externalId" text; ALTER TABLE Lines ADD COLUMN "externalId" text;')
    knex.schema.createTable('users', function (table) {
      table.increments() //auto incrementing IDs
      table.string('email');
      table.string('firstName');
      table.string('lastName');
      table.timestamps();

    })
  }

  down () {
    return this.client.query('ALTER TABLE Spots DROP COLUMN "externalId"; ALTER TABLE Lines DROP COLUMN "externalId";');
  }
}

