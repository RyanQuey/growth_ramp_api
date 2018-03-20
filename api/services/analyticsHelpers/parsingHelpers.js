// for help parsing what we get from their apis

const parsingHelpers = {
  prettyPrintValue: (rawValue, valueType) => {
    let value

    if (valueType === "PERCENT") {
      //round to 100ths
      value = parseFloat(rawValue) ? Math.round(rawValue * 100) / 100 : rawValue
      value = String(value) + "%"

    // what GSC does. Returns .15 for 15%
    } else if (valueType === "DECIMALED_PERCENT") {
      //round to 100ths
      value = parseFloat(rawValue) ? Math.round(rawValue * 100) : rawValue
      value = String(value) + "%"
    } else if (valueType === "FLOAT") {
      //round to 100ths
      value = parseFloat(rawValue) ? Math.round(rawValue * 100) / 100 : rawValue

    } else if (valueType === "TIME") {
      //convert seconds to HH:mm:ss format
      value = (new Date(rawValue * 1000)).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0]
    } else {
      value = rawValue
    }

    return value
  },
}
module.exports = parsingHelpers
