const fs = require('fs-extra');
const Helpers = require('../services/Helpers');
const AddHelpers = require('./helpers');
const Handlebars = require('handlebars');
AddHelpers(Handlebars);
const templates = {};
let path
let dir = `${__dirname}/email/`;
let files = fs.readdirSync(dir);

for (let file of files) {
  if (file.indexOf('.handlebars') !== -1) {
    path = dir + file;
    let data = fs.readFileSync(path, 'utf8');
    let baseName = file.split('.handlebars')[0];
    // for when used as a partial
    Handlebars.registerPartial(baseName, data);
    // for when used as a standalone template
    templates[baseName] = Handlebars.compile(data);
  }
}

const layouts = {};

let layoutDir = `${__dirname}/layouts/`;
let layoutFiles = fs.readdirSync(layoutDir);
for (let file of layoutFiles) {
  if (file.indexOf('.handlebars') !== -1) {
    path = layoutDir + file;
    let data = fs.readFileSync(path, 'utf8');
    let baseName = file.split('.handlebars')[0];
    layouts[baseName] = Handlebars.compile(data);
  }
}

module.exports = {
  signupConfirmation: function (info) {
    info.template = 'signup-confirmation';

    return new Promise((resolve, reject) => {
      resolve({
        body: layouts['html-layout'](info),
        subject: "Please confirm your email for your Growth Ramp account"
      });
    });
  },

  loginToken_user: function (info) {
    info.template = 'login-token-user';

    return new Promise((resolve, reject) => {
      resolve({
        body: layouts['html-layout'](info),
        subject: "Growth Ramp login code"
      });
    });
  },

  invoiceCreated: function (info) {
    return new Promise((resolve, reject) => {
      resolve({
        body: templates['invoice-created'](info),
        subject: "New Invoice from Growth Ramp"
      });
    });
  },

  resetPassword: function (info) {
    info.template = 'reset-password';
    return new Promise((resolve, reject) => {
      resolve({
        body: layouts['html-layout'](info),
        subject: "Password Reset Request"
      });
    });
  },

};
