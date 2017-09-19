const CONNECTIONS = require('../config/connections.js').connections;
const PASSWORD = process.env.PG_PASSWORD
const USER = process.env.PG_USER

const DATABASE = process.env.PG_DATABASE
const knex = require("knex")({
  //maps to the pg node library
  client: 'pg',
  connection: {
    host :
  }
})
