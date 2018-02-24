module.exports = {
  //currently based solely on dates of data given
  //goal is to have 4-6 labels
  //NOTE keep in sync between frontend and api
  getXAxisData: ({startDate, endDate}) => {
    const start = moment(startDate)
    const end = moment(endDate)
    //diff in days
    const filterLength = end.diff(start) / 1000 / 60 / 60 / 24

    let unit, step
    if (filterLength < 30) {
      unit = "Day"
      step = 1

    } else if (filterLength < 30 * 7) {
      unit = "Week"
      step = 1

    } else if (filterLength < 30 * 30) {
      unit = "Month"
      step = 1

    } else {
      unit = "Month" //GA doesn't do nthYear, so must do months here, but year in frontend
      step = 12
    }

    /* Array.from()not working for some reason, so working around
    const range = moment.range(start, end)
console.log("range", range, step, unit, filterLength, "days");
console.log(range.by(unit, {step: step}));
    const rangeArray = Array.from(range.by(unit, {step: step}))
    */

    const rangeArray = []
    let current = start.clone()

    let count = 0
    //count should never be needed, but good safeguard in case I do something bad :)
    while (!current.isAfter(end) && count < 25) {
      count ++
      console.log("current", current, "end", end, unit, step);
      rangeArray.push(current)
      current = current.clone().add(step, unit)
    }

console.log(rangeArray);
//currently endDate and startDate are moments. Only endDate is being used, and only in frontend
    return {rangeArray, unit, step, endDate: end, startDate: start}
  },

  getHistogramBuckets: ({rangeArray, unit, step}) => {
    const range = [...rangeArray]
    //remove the first, since GA will take first item and everything below that counts as first histogram bucket, and the first item in array is actually first date
    range.shift()

    //using nth week, nthDay etc for ga dimension, so using this
    const buckets = range.map((date, index) =>
      (index +1) * step
    )

    return buckets
  }

}

