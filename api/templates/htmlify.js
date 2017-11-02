module.exports = function (string) {
  // just some simple replacements, like for \n\n or **
  return string.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\r*\n/g, '<br />')
  .replace(/\[(http[^\]]+)\]/,'<a href="$1">$1</a>');
}
