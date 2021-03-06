/**
 * NotificationsController
 *
 * @description :: Server-side logic for managing notifications
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var templates = require('../templates/');

const blueprints = require('../blueprints');
module.exports = {
  find: (req, res) => {
    return blueprints.find(req, res);
  },
  contactUs: (req, res) => {
    let info = {
      type: req.body.type || "", //if bug, or request, etc
      message: req.body.message || "",
      user: req.user,
    }

    Notifier.contactUs(info)
    .then((result) => {
      return res.ok()
    })
  },
};
