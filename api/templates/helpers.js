var htmlify = require('./htmlify');
var formatDate = require('./formatDate')

function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
}

function equals(s1, s2) {
  return s1 === s2;
}

function log (o) {
  console.log("Handlebars log: ", o);
}

module.exports = function (Handlebars) {
  Handlebars.registerHelper('capitalize', capitalize);
  Handlebars.registerHelper('formatDate', formatDate);
  Handlebars.registerHelper('htmlify', htmlify);
  Handlebars.registerHelper('log', log);
  Handlebars.registerHelper('eq', equals);
}
