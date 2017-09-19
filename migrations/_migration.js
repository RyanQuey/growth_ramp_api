const uuid = require('uuid');

module.exports = class Migration {
  constructor (version, pool) {
    this.pool = pool;
    this.version = version;
    this.needed = true;
    this.skipped = false;
    this.noSettings = false;
    //this.allowed.up() and down() determine if the particular version is allowed to run, based on its position relative the latest schema version
    this.allowed = {
      up: (current) => { return !current || parseInt(this.version) > parseInt(current); },
      down: (current) => { return parseInt(this.version) <= parseInt(current); }
    }
  }

  // Check to see if we need to run.  If this returns an error, then we will run.
  check () {
    return new Promise((resolve, reject) => { reject(); })
  }

  before (action) {
    console.log('before(): ', this.version);
    return this.pool.connect()
    .then((c) => {
      this.client = c;

      //determines which migrations have already been ran
      //
      return this.client.query("SELECT * FROM Settings WHERE NAME = 'dbVersion'")
      .then(() => {
        return new Promise((resolve, reject) => {
          this.check()
          .then(() => {
            if (action !== 'down') {
              this.needed = false;
              console.log('... skipping because it is not needed.');
            }
            resolve();
          })
          .catch((err) => {
            if (action === 'down') {
              this.needed = false;
              console.log('... skipping because it is not needed.');
            }
            resolve();
          });
        });
      })
      .catch((error) => {
        this.noSettings = true;

        return;
      });
    })
    .then(() => {
      return this.client.query('BEGIN TRANSACTION;');
    });
  }

  after () {
    return this.client.query('END TRANSACTION;')
    .then(() => {
      return this.client.release();
    })
  }

  success (action) {
    if (this.needed) {
      return this.updateVersion(action);
    } else {
      return true;
    }
  }

  migrate (action) {
    return this.getCurrentDbVersions()
    .then((versions) => {
      let currentVersion = versions[versions.length - 1];

      if (this.allowed[action](currentVersion)) {
        return this[action]();
      } else {
        return this.skip();
      }
    });
  }

  skip () {
    console.log('skipping.');
    this.skipped = true;
    return new Promise((resolve, reject) => { resolve(); });
  }

  up () {
    return new Promise((resolve, reject) => {
      resolve();
    });
  }

  down () {
    return new Promise((resolve, reject) => {
      resolve();
    });
  }

  query (sql) {
    return this.client.query(sql);
  }

  getCurrentDbVersions () {
    let dbVersions = [];

    return new Promise((resolve, reject) => {
      if (this.noSettings) {
        return resolve(dbVersions);
      }

      this.client.query("SELECT * FROM Settings WHERE name = 'dbVersion'")
      .then((result) => {
        if (result.rows.length !== 0 && result.rows[0].value) {
          dbVersions = result.rows[0].value.split(',');
        }

        if (dbVersions[0] === '') {
          dbVersions.slice(0, 1);
        }

        resolve(dbVersions);
      })
      .catch(() => {
        resolve(dbVersions);
      });
    });
  }

  updateVersion (action) {
    let dbVersions = [];

    if (this.skipped) {
      return new Promise((resolve, reject) => { resolve(); });
    }

    return this.client.query("SELECT * FROM Settings WHERE name = 'dbVersion'")
    .then((result) => {
      if (result.rows.length !== 0 && result.rows[0].value) {
        dbVersions = result.rows[0].value.split(',');
      }

      if (dbVersions[0] === '') {
        dbVersions.slice(0, 1);
      }

      if (action === 'down' && String(dbVersions[dbVersions.length-1]) === String(this.version)) {
        dbVersions.pop();
      } else {
        dbVersions.push(String(this.version));
      }

console.log('updating versions...', dbVersions);
      return this.client.query(`INSERT INTO Settings (id, name, value) VALUES ('${uuid.v4()}', 'dbVersion', '${dbVersions.join(',')}') ON CONFLICT (name) DO UPDATE SET value = '${dbVersions.join(',')}' WHERE EXCLUDED.name = 'dbVersion'`);
    });
  }
}

