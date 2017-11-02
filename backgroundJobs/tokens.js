var Job = require('./job');
var moment = require('moment');

//cleans up old tokens
module.exports = class Tokens extends Job {
  constructor (options) {
    super();
    this.models = options.models;
    this.now().every('12 hours');
    this.running = false;
    this.toDo = 0;
    this.done = 0;
    return this;
  }

  run () {
    sails.log.debug(moment().toString(), 'Check to see if we should delete any tokens!');
    if (this.running) {
      sails.log.debug('already running...');
      return;
    }

    this.running = true;

    this.models.tokens.destroy({ expires: { '<': moment().subtract(72, 'hours').format() } })
    .then((destroyed) => {
      sails.log.debug('Destroyed ' + destroyed.length + ' tokens that had expired.');
      this.running = false;
    })
    .catch((err) => {
      sails.log.error(err);
      this.running = false;
    });
  }
}
