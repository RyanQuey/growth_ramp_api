// Update with your config settings.
const connections = require("./config/connections").connections
const development = connections.development
const production = connections.production

module.exports = {

  development: {
    client: 'postgresql',
    connection: {
      database: development.database,
      user:     development.user,
      password: development.password,
      host: development.host
    },
    pool: {
      min: 2,
      max: development.poolSize
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  /*staging: {
    client: 'postgresql',
    connection: {
      database: 'my_db',
      user:     'username',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },*/

  production: {
    client: 'postgresql',
    connection: {
      database: production.database,
      user:     production.user,
      password: production.password,
      host: production.host
    },
    pool: {
      min: 2,
      max: production.poolSize
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

};
