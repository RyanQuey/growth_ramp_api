// general helpers for generating queries
const queryHelpers = {
  // takes dataset string and parses to get relevant data
  parseDataset: (dataset) => {
    const datasetParts = dataset.split("-")
    const displayType = datasetParts[0]

    let rowsBy, columnSetsArr, xAxisBy
    if (displayType === "table") {
      rowsBy = datasetParts[1] || ""
      const columnSetsStr = datasetParts[2] || ""
      columnSetsArr = columnSetsStr.split(",") || []

    } else if (displayType === "table") {
      xAxisBy = datasetParts[1] || ""
    }

    return {datasetParts, displayType, rowsBy, xAxisBy, columnSetsArr}
  },

  whomToAsk: (dataset) => {
    const {datasetParts, displayType, rowsBy, xAxisBy, columnSetsArr} = queryHelpers.parseDataset(dataset)
    const ret = []

    if (displayType === "table") {
      if (!rowsBy.includes("keyword")) {
        ret.push("GoogleAnalytics")
      } else {
        ret.push("GoogleSearchConsole")
      }
    } else if (displayType === "chart") {
//TODO fix for GSC later
        ret.push("GoogleAnalytics")

    }

    return ret
  },
}

module.exports = queryHelpers
