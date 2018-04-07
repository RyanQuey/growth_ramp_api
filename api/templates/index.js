//var sms = require('./sms');
var email = require('./email');
var Styliner = require('styliner');
const styliner = new Styliner()

function inlineCss (mail) {
  return new Promise((resolve, reject) => {
    styliner.processHTML(mail.body)
    .then((inlinedMail) => {
      mail.body = inlinedMail;
      resolve(mail);

    })
    .catch((err) => {
      sails.log.error('CSS INLINER FAILED:');
      sails.error(err);

      sails.log.error('sending along non-inlined version');
      //TODO maybe have to do mail.body = mail.plainTextMessage ?
      resolve(mail);
    });
  });
};

module.exports = {
  contactUs: function (info) {
    let toReturn = {
      //sms: {},
      email: {}
    };

    return new Promise((resolve, reject) => {
      email.contactUs(info)
      .then((stuff) => {
        toReturn.email = stuff;
        resolve(toReturn);
      })
      .catch((err) => {
        reject(err);
      });
    });
  },

  signupConfirmation: function (info) {
    let toReturn = {
      //sms: {},
      email: {}
    };

    return new Promise((resolve, reject) => {
      email.signupConfirmation(info)
      .then((mail) => {
        return inlineCss(mail);
      })
      .then((stuff) => {
        toReturn.email = stuff;
        resolve(toReturn);
      })
      .catch((err) => {
        reject(err);
      });
    });
  },

  resetPassword: function (info) {
    let toReturn = {
      //sms: {},
      email: {}
    };

    return new Promise((resolve, reject) => {
      email.resetPassword(info)
      .then((mail) => {
        return inlineCss(mail);
      })
      .then((stuff) => {
        toReturn.email = stuff;
        resolve(toReturn);
      })
      .catch((err) => {
        reject(err);
      });
    });
  },

  newAuditNotification: function (info) {
    let toReturn = {
      //sms: {},
      email: {}
    };

    return new Promise((resolve, reject) => {
      email.newAuditNotification(info)
      .then((mail) => {
        return inlineCss(mail);
      })
      .then((stuff) => {
        toReturn.email = stuff;
        resolve(toReturn);
      })
      .catch((err) => {
        reject(err);
      });
    });
  },

  invoiceCreated: function (info) {
    let toReturn = {
      //sms: {},
      email: {}
    };

    return new Promise((resolve, reject) => {
      email.invoiceCreated(info)
      .then((mail) => {
        return inlineCss(mail);
      })
      .then((stuff) => {
        toReturn.email = stuff;
        resolve(toReturn);
      })
      .catch((err) => {
        reject(err);
      });
    });
  },

  loginToken_user: function (info) {
    let toReturn = {
      //sms: {},
      email: {}
    };

    return new Promise((resolve, reject) => {
      email.loginToken_user(info)
      .then((mail) => {
        return inlineCss(mail);
      })
      .then((stuff) => {
        toReturn.email = stuff;
        return sms.loginToken_user(info);
      })
      .then((stuff) => {
        toReturn.sms = stuff;
        resolve(toReturn);
      })
      .catch((err) => {
        reject(err);
      });
    });
  },

}
