module.exports = function (timestamp, timezone, fmt) {
  if (!fmt || typeof fmt !== 'string') {
    fmt = 'MMMM D Y, h:mm a';
  }
  let m = moment(timestamp);
  if (timezone) {
    m.tz(timezone);
  }

  return m.format(fmt);
}
