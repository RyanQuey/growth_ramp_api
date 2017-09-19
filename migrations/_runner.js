var moment = require('moment');
var fs = require('fs');
var uuid = require('uuid');
var pg = require('pg');
var NODE_ENV = process.env.NODE_ENV || 'development';
var _ = require('lodash');

module.exports = class {
  getPool () {
    let SAILS_ENV = require(`../config/env/${NODE_ENV}`)
    let CONNECTIONS = require('../config/connections.js').connections;
    let MODELS = require('../config/models.js');
    let LOCAL;
    try {
      LOCAL = require('../config/local.js');
      if (LOCAL.connections) {
        CONNECTIONS = _.extend(LOCAL.connections);
      }
    } catch (e) {
      console.log('No local configuration: ', e);
    }

    let CONNECTION_NAME = MODELS.connection;
    if (SAILS_ENV.models && SAILS_ENV.models.connection) {
      CONNECTION_NAME = SAILS_ENV.models.connection;
    }

    let CONNECTION_CONFIG = CONNECTIONS[CONNECTION_NAME];

    console.info('* * Connecting to database * *');

    this.pool = new pg.Pool(CONNECTION_CONFIG);
  }

  getMigrations () {
    this.getPool();

    return new Promise((resolve, reject) => {
      this.migrations = {};
      let dir = `${__dirname}/versions/`;
      let files = fs.readdirSync(dir);
      for (let file of files) {
        if (file.indexOf('.js') !== -1) {
          let version = file.split('.js')[0];
          let path = dir + file;

          version = moment.utc(version).unix();

          let c = require(path);
          let m = new c(version, this.pool);

          if (typeof m.up !== 'function' || typeof m.down !== 'function' || typeof m.name !== 'string') {
            console.log(`${path} was not a valid migration!`);
            process.exit();
          }

          if (typeof m.reset !== 'function') {
            m.reset = function () {
              return new Promise((resolve, reject) => { resolve('No reset actions.'); });
            };
          }

          this.migrations[version] = m;
        }
      }

      this.migrationsOrder = Object.keys(this.migrations).sort((a, b) => { return a - b; });

      resolve();
    });
  }

  migrateUpTo (target) {
    this.action = 'up';

    if (!target) {
      target = this.migrationsOrder[this.migrationsOrder.length - 1]
    }

    return new Promise((resolve, reject) => {
      this.processNext(null, resolve, reject, target);
    });
  }

  processNext (finishedVersion, resolve, reject) {
    if (finishedVersion) {
      this.migrations[finishedVersion].finished = true;
    } else {
      console.log("Shooting for version: " + this.target);
    }

    for (let i = 0; i < this.migrationsOrder.length; i++) {
      let v = this.migrationsOrder[i];

      if (this.migrations[v].finished) {
        continue;
      }

      if (this.action === 'down' && String(v) === String(this.target)) {
        console.log("Finished, reached " + this.target);

        break;
      }

      return this.process(this.migrationsOrder[i], resolve, reject);
    }

    this.finish();
    resolve();
  }

  error (stuff, migration) {
    console.log(stuff);
    console.log(migration.name + ' failed.');
    migration.client.release();
    return this.finish();
  }

  finish () {
    this.pool.end();
    console.log('* * DONE! * *');
  }

  process (version, resolve, reject) {
    let migration = this.migrations[version];

    console.log(`Running migration ${this.action} on version ${version}: ${migration.name}`)

    return migration.before(this.action)
    .then(() => { if (!migration.needed) return; return migration.migrate(this.action); } )
    .then(() => { return migration.after(); } )
    .then(() => { return migration.success(this.action); } )
    .then(() => {
      console.log('woot!');
      return this.processNext(version, resolve, reject);
    })
    .catch((stuff) => {
      this.error(stuff, migration);
    });
  }

  migrateDownTo (target) {
    this.action = 'down';

    if (/\d+T\d+/.test(target)) {
      target = moment.utc(target).unix();
    }

    if (!target) {
      target = this.migrationsOrder[this.migrationsOrder.length - 2];
    }

    if (!target) {
      throw new Error('Invalid target version specified!');
    }

    this.target = target;

    this.migrationsOrder = this.migrationsOrder.reverse();

    return new Promise((resolve, reject) => {
      this.processNext(null, resolve, reject);
    });
  }
}

