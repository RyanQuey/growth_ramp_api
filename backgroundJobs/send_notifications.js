var Job = require('./job');
var moment = require('moment');
const mailgun = require('mailgun-js')({apiKey: "key-d8198d22adf5397bb73ef672482166c6", domain: 'www.growthramp.io'})

//sends any unsent notifications
module.exports = class SendNotifications extends Job {
  constructor (options) {
    super();
    this.model = options.model;
    this.now().every('2 minutes');
    //this.plivoClient = sails.config.plivo.client;
    this.mailgunClient = mailgun;

    this.running = false;
    return this;
  }

  run () {
    //sails.log.debug(moment().toString(), 'Check for new notifications!');
    if (this.running) {
      sails.log.debug('already running...');
      return;
    }

    let processed = 0;
    let finish = (queue) => {
      //sails.log.debug('finished processing the queue');
      this.running = false;
    }

    let processedQueue = (queue) => {
      processed += 1;

      if (processed === queue.length) {
        finish(queue);
      }
    }

    this.running = true;
    this.model.find({ sent: false })
    .then((queue) => {
      if (queue.length > 0) {
        for (let i = 0; i < queue.length; i++) {
          let stuff = queue[i];

          if (sails.config.TESTMODE) {
            sails.log.debug('Skipping sending the notification.');
            this.model.update({ id: stuff.id }, { sent: true })
            .then(() => {
              processedQueue(queue);
            })
            .catch((err) => {
              sails.log.error(err);
              processedQueue(queue);
            });

            continue;
          }

          //not configured yet
          if (stuff.method === 'sms') {
            let params = {
              src: stuff.from,
              dst: stuff.addresses.join('<'),
              text: stuff.body,
              method: "GET"
            };

            sails.log.debug(params);
            if(!sails.config.TEST_MODE) {
/*
              this.plivoClient.send_message(params, (status, response) => {
                if (response) {
                  sails.log.debug('Status: ', status);
                  sails.log.debug('API Response:\n', response);
                  sails.log.debug('Message UUID:\n', response['message_uuid']);
                  sails.log.debug('Api ID:\n', response['api_id']);
                } else {
                  sails.log.error('Plivo sending failed, status: ', status);
                }
              });
*/
            }

            this.model.update({ id: stuff.id }, { sent: true })
            .then(() => {
              processedQueue(queue);
            })
            .catch((err) => {
              sails.log.error(err);
              processedQueue(queue);
            });
          } else if (stuff.method === 'email') {
            for (let q = stuff.addresses.length; q--;) {
              let to = stuff.addresses[q];
              let message = {
                from: stuff.from || "support@growthramp.io",
                to,
                subject: stuff.subject,
                html: stuff.body
              }

              if (!sails.config.TEST_MODE) {
                this.mailgunClient.messages().send(message, (error, body) => {
                  sails.log.debug(body);
                  sails.log.error(error);
                });
              }
            }

           //updating
            this.model.update({ id: stuff.id }, { sent: true })
            .then(() => {
              return processedQueue(queue);
            })
            .catch((err) => {
              sails.log.error(err);
              processedQueue(queue);
            });
          } else {
            sails.log.error('Unsupported notification method provided:', stuff.method);
            processedQueue(queue);
          }
        }
      } else {
        this.running = false;
        return true;
      }
    });
  }
}
