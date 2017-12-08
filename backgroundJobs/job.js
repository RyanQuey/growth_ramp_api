var moment = require('moment');

JOBS_ENABLED = String(process.env.RUN_BACKGROUND_JOBS || sails.config.env.RUN_BACKGROUND_JOBS) === 'true';

module.exports = class Job {
  constructor () {
    this.interval = 60;
    this.repeatJob = false;
    this.skipped = 0;
    this.running = false;

    return this;
  }

  run () {
    sails.log.debug('Base timer running!');
  }

  isRunning () {
    if (this.running && this.skipped > 3) {
      this.running = false;
      this.skipped = 0;

      sails.log.debug('was set to already running, but already skipped 3 times, so setting running to false.');

      return false;
    }

    if (this.running) {
      sails.log.debug('already running...');
      this.skipped += 1;

      return true;
    }

    this.skipped = 0;

    return false;
  }

  getMsDuration (str) {
    let days = str.match(/(\d+)\s*d/);
    let hours = str.match(/(\d+)\s*h/);
    let minutes = str.match(/(\d+)\s*m[i$]/);
    let seconds = str.match(/(\d+)\s*s/);
    let mseconds = str.match(/(\d+)\s*ms/);
    if (days)     { return parseInt(days[1])*86400*1000; }
    if (hours)    { return parseInt(hours[1])*3600*1000; }
    if (minutes)  { return parseInt(minutes[1])*60*1000; }
    if (seconds)  { return parseInt(seconds[1])*1000; }
    if (mseconds) { return parseInt(mseconds[1]); }

    // default to seconds.
    return Number(str)*1000;
  }

  every (time) {
    this.interval = this.getMsDuration(time);
    this.repeat();
    return this;
  }

  repeat () {
    this.repeatJob = true;
    return this;
  }

  once () {
    this.repeatJob = false;
    return this;
  }

  in (time) {
    this.runNow = false;
    this.delay = this.getMsDuration(time);
    return this;
  }

  now () {
    this.runNow = true;
    return this;
  }

  start () {
    if (!JOBS_ENABLED) {
      return;
    }
    let go = () => {
      if (this.repeatJob) {
        sails.log.debug(`Running every ${this.interval}ms`);
        let stopObject = setInterval(this.run.bind(this), this.interval)
        this.stopFunction = () => { clearInterval(stopObject); }
      }

      if (this.runNow || !this.repeatJob) {
        sails.log.debug('Running now');
        let stopObject = setImmediate(this.run.bind(this));
        this.stopFunction = () => { clearImmediate(stopObject); }
      }
    }

    if (this.delay) {
      setTimeout(go, this.delay);
    } else {
      go();
    }
  }

  stop () {
    this.stopFunction();
  }


};
