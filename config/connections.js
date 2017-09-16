/**
 * Connections
 * (sails.config.connections)
 *
 * `Connections` are like "saved settings" for your adapters.  What's the difference between
 * a connection and an adapter, you might ask?  An adapter (e.g. `sails-mysql`) is generic--
 * it needs some additional information to work (e.g. your database host, password, user, etc.)
 * A `connection` is that additional information.
 *
 * Each model must have a `connection` property (a string) which is references the name of one
 * of these connections.  If it doesn't, the default `connection` configured in `config/models.js`
 * will be applied.  Of course, a connection can (and usually is) shared by multiple models.
 * .
 * Note: If you're using version control, you should put your passwords/api keys
 * in `config/local.js`, environment variables, or use another strategy.
 * (this is to prevent you inadvertently sensitive credentials up to your repository.)
 *
 * For more information on configuration, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.connections.html
 */

var ENV = process.env;
var HDBURL = process.env.DATABASE_URL;
var HEROKU_DB = {};

if (HDBURL) {
  //postgres://(user):(password)@(host):(port)/(dbname)
  //S(non- spaces)
  //+ (one or more)
  //^ beginning of input, or in brackets, means not___
  ///d digits
  var matches = HDBURL.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(\S+)/);
  HEROKU_DB = {
    user: matches[1],
    password: matches[2],
    host: matches[3],
    port: matches[4],
    dbname: matches[5]
  };
}
module.exports.connections = {

  //this is the key that will get connected into by the model config
  postgresProduction: {
    adapter: "sails-postgresql-extended",
    database: HEROKU_DB.dbname   || ENV['CUSTOM_DB_NAME'] ||  'growth_ramp_api',
    host:     HEROKU_DB.host     || ENV['CUSTOM_HOSTNAME'] || 'localhost',
    user:     HEROKU_DB.user     || ENV['CUSTOM_USERNAME'] || 'postgres',
    password: HEROKU_DB.password || ENV['CUSTOM_PASSWORD'] || 'password',
    port:     HEROKU_DB.port     || ENV['CUSTOM_PORT'] || 5432,
    poolSize: 10,
    ssl: true
  },

  postgresDevelopment: {
    adapter: "sails-postgresql",
    database: HEROKU_DB.dbname   || ENV['CUSTOM_DB_NAME']  || 'growth_ramp_api',
    host:     HEROKU_DB.host     || ENV['CUSTOM_HOSTNAME'] || 'localhost',
    user:     HEROKU_DB.user     || ENV['CUSTOM_USERNAME'] || 'postgres',
    password: HEROKU_DB.password || ENV['CUSTOM_PASSWORD'] || 'password',
    port:     HEROKU_DB.port     || ENV['CUSTOM_PORT']     || 5432,
    poolSize: 10,
    ssl: false
  },

  postgresTest: {
    adapter: "sails-postgresql",
    database: 'growth_ramp_test',
    host: 'localhost',
    user: 'test',
    password: 'password',
    port: 5432,
    poolSize: 10,
    ssl: false
  }
  /*
  somePostgresqlServer: {
     adapter: 'sails-postgresql',
     host: 'YOUR_POSTGRES_SERVER_HOSTNAME_OR_IP_ADDRESS',
     user: 'YOUR_POSTGRES_USER', // optional
     password: 'YOUR_POSTGRES_PASSWORD', // optional
     database: 'postgresDevelopment' //optional
   }
  */
};
