/**
 * Notifications.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    userId:       { model: 'users', type: "integer" },
    identifier:   { type: "string" },
    method:       { type: "string", defaultsTo: "email" },
    sent:         { type: "boolean", defaultsTo: false },
    subject:			{ type: "string" },
    body:         { type: "string", required: true },
    plainTextMessage:         { type: "string", defaultsTo: '' },
    addresses:    { type: "array", required: true },
    from:         { type: "string", required: true },
	}
};
