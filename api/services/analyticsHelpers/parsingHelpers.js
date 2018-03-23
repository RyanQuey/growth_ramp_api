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

  nonPrettyValue: (prettyValue, valueType) => {
    let value

    //might also parseFloat too
    if (["PERCENT", "DECIMALED_PERCENT"].includes(valueType)) {
      value = prettyValue.replace("%", "")

    } else if (valueType === "TIME") {
      //convert from HH:mm:ss format to milliseconds
      let values = prettyValue.split(":")
      value = values[0] *60 *60 + values[1]*60 + values[2] * 1000
    } else {
      value = prettyValue
    }

    return value
  },
}
module.exports = parsingHelpers
