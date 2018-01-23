const sanitize_sqlstring = require('sqlstring');
const daysOfTheWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
import _ from 'lodash'
import { PROVIDER_STATUSES, PROVIDERS, ALL_CHANNEL_TYPES, UTM_TYPES, ALL_POSTING_AS_TYPES } from "../constants"

export default {

  handleError: ((message, err) => {
//maybe put this, or even better, call this from the responses config
  }),

  sanitizeSQL: function (str) {
    return 'E' + sanitize_sqlstring.escape(str);
  },

  chomp: function (str) {
    return str.replace(/^\s+/, '').replace(/\s+$/, '');
  },

  round: function (value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
  },

  weightInLbs: function (val) {
    if (/kg/i.test(val)) {
      val = Helpers.round(parseFloat(val) * 2.20462, 2);
    } else if (/\dg/i.test(val)) {
      val = Helpers.round(parseFloat(val) * .00220462, 2);
    } else if (/^\s*(\d+)\s*lbs?[,\s]*(\d+)\s*oz/i.test(val)) {
      let matches = val.match(/^\s*(\d+)\s*lbs?[,\s]*(\d+)\s*oz/);
      let lbs = matches[1];
      let oz = matches[2];

      val = parseFloat(lbs) + (parseFloat(oz) / 16);
    } else {
      val = parseFloat(val);
    }

    return val;
  },

  capitalize: function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },

  pad: function (n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(Math.round((width - n.length + 1)/z.length)).join(z) + n;
  },

  getYMD: function (string) {
    let m = string.match(/(\d+)[\/-](\d+)[\/-](\d+)/);
    let [month, day, year] = [m[1], m[2], m[3]];

    if (m[1].length > 2) {
      // we are actually in YYYY/MM/DD format
      [year, month, day] = [m[1], m[2], m[3]];
    }

    year = this.pad(year, 4, '20');
    month = this.pad(month, 2);
    day = this.pad(day, 2);

    return [month, day, year];
  },

  // parse a timezone (e.g., 'GMT-8' or '-8:00' or 'PST') and return the UTC offset (-08:00)
  parseOffset: function (tz) {
    let offset = tz;

    if (tz && tz.toLowerCase() !== 'Z') {
      let om = tz.match(/([-\+])(\d+):?(\d+)?/);
      if (om) {
        offset = om[1] + this.pad(om[2], 2) + ':';
        if (om[3]) {
          offset += this.pad(om[3], 2);
        } else {
          offset += '00';
        }
      }
    }

    return offset;
  },

  // parse a date and return: { date: MM/DD/YYYY, time: HH:MM:SS, offset: -X (or +x or Z)
  parseDate: function (date) {
    let regex;
    let m;

    regex = new RegExp(/^(\d+[\/-]\d+[\/-]\d+)[T\s]+(\d+):(\d+)\s*(am|pm)*$/, 'i');
    m = date.match(regex);
    if (m) {
      let [month, day, year] = this.getYMD(m[1])

      if (m[4] && m[4].toLowerCase() === 'pm') {
        m[2] = parseInt(m[2]) + 12;
      }
      m[2] = this.pad(m[2], 2);
      m[3] = this.pad(m[3], 2);

      return {
        date: `${month}/${day}/${year}`,
        time: `${m[2]}:${m[3]}:00`
      };
    }

    regex = new RegExp(/^(\d+[\/-]\d+[\/-]\d+)[T\s]+(\d+):(\d+):(\d+)\.?(\d*)\s*(Z|GMT\S+|UTC\S+|[-\+]\S+)?$/, 'i');
    m = date.match(regex);
    if (m) {
      let [month, day, year] = this.getYMD(m[1])
      m[2] = this.pad(m[2], 2);
      m[3] = this.pad(m[3], 2);
      m[4] = this.pad(m[4], 2);

      let offset = this.parseOffset(m[6]);
      // Hack for eVet sending .00000 without a timezone indicator.
      if (m[5] === '0000000') {
        offset = 'Z';
      }

      return {
        date: `${month}/${day}/${year}`,
        time: `${m[2]}:${m[3]}:${m[4]}`,
        offset
      };
    }
    return {}
  },

  //flattens array of arrays one level
  flatten: (array) => {
    return [].concat.apply([], array)
  },

  overwriteTimezone: function (date, timezone) {
    if (!timezone) {
      return date;
    }

    let offset;
    let ds;
    let originalOffset = moment.parseZone(date).utcOffset();

    date = moment(date).utcOffset(originalOffset);

    if (Object.keys(hackyAbbreviations).indexOf(timezone.toUpperCase()) != -1) {
      timezone = hackyAbbreviations[timezone];
    }

    if (/[+-]\d+(:\d+)?/.test(timezone)) {
      offset = timezone;
    } else {
      offset = moment.tz(timezone).format('Z');
    }

    ds = date.format().split(/[-+Z]/).slice(0, -1).join('-') + offset;
    return moment(ds).utcOffset(offset);
  },

  safeDataPath: function (object, keyString, def = null) {
    if (!object || !keyString) {
      return null;
    }

    let keys = keyString.split('.');
    let returnValue = null;
    let lookup = object;

    for (let key of keys) {
      if (lookup[key]) {
        returnValue = lookup[key];
        lookup = lookup[key];
      } else {
        return def;
      }
    }

    return returnValue;
  },

  prettyDate: function (date) {
    let matches = date.match(/(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})/);

    if (!matches) {
      return;
    }

    let m = matches[1];
    let d = matches[2];
    let y = matches[3];

    // make it into mm/dd/yyyy from yyyy/mm/dd
    if (matches[1].length === 4) {
      m = matches[2];
      d = matches[3];
      y = matches[1];
    }

    return `${Helpers.pad(m, 2, '0')}/${Helpers.pad(d, 2, '0')}/${y}`;
  },

  states: {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming"
  },

  //takes an object with keys of the days of the week, and values being array of hour blocks, and changes the values to a string
  //{Monday: ["09:00", "10:00", "15:00"]}  => {Monday: "9:00 - 10:59am, 3:00 - 3:59pm"}
  humanizeHoursPerDay: function (days) {
    let returnedObject = {}
    Object.keys(days).forEach((day) => {
      const dayHours = days[day]

      if (!dayHours || dayHours.length === 0) { return }
      dayHours.sort()
      let firstHour = lastHour = parseInt(dayHours.shift())
      const startBlock = (hourInt) => `${moment(hourInt, 'h:mm').format('h:mm a')} - `
      const closeBlock = (hourInt) => `${moment(hourInt, 'h:mm').endOf('hour').format('h:mm a')}`

      let stringForDay = startBlock(firstHour)

      dayHours.forEach((h, index) => {
        const thisHour = parseInt(h)
        //if not next consecutive order, close off the last group and start a new one
        if (!(thisHour === lastHour +1)) {
          stringForDay += `${closeBlock(lastHour)}, ${startBlock(thisHour)}`
        }

        //if last hour of the day, close off the final hour group
        if (index === dayHours.length -1) {
          stringForDay += closeBlock(lastHour)
        }

        lastHour = thisHour
      })

      returnedObject[day] = stringForDay
    })

    return returnedObject
  },

  //turns an array of records into an object, with keys being id
  sortRecordsById: function(records) {
    const ret = {}

    for (let i = 0; i < records.length; i++) {
      let record = records[i]
      ret[record.id] = record
    }

    return ret
  },

  combineArraysOfRecords: (arrayOne, arrayTwo, updatedValues) => {
    //basically, starts with arrayOne.
    //iterate over arrayTwo, if a record in arrayTwo matches the id of one in arrayOne, merge updatedValues of record from Two into One
    //helpful if arrayOne is populated and arrayTwo is not, but has updated attributes
    //only updating updatedValues makes sure you don't overwrite the populated columns!!
    let ret = [...arrayOne]
    for (let updatedRecord of arrayTwo) {
      //be sure not to use vanilla js find...might call something in sails
      let originalRecord = _.find(ret, (r) => r.id == updatedRecord.id)
      //if a match is found
      if (originalRecord && originalRecord !== -1) {
        for (let attr of updatedValues) {
          //keeping the reference to same obj, so old record really is updated
          originalRecord[attr] = updatedRecord[attr]
        }
      } else {
        //if arrayTwo has unique item, add the whole record
        ret.push(updatedRecord)
      }
    }

    return ret
  },

  //takes utm sset and converts to final string
  extractUtmString: (post, campaign) => {
    //only get active with values
    let utmList = ['campaignUtm', 'contentUtm', 'mediumUtm', 'sourceUtm', 'termUtm', 'customUtm'].filter((type) => (
      post[type] && post[type].active && post[type].active !== "false" && post[type].value
    ))

    const campaignName = campaign.name.replace(/\s+/g, "-")

    //turn into parameters
    utmList = utmList.map((type) => {
      let campaignNameRegex = /{{campaign.name}}/g
      let campaignIdRegex = /{{campaign.id}}/g
      let computedValue = post[type].value.replace(campaignNameRegex, campaignName).replace(campaignIdRegex, campaign.id)

      if (type === "customUtm") {
        return `${post[type].key}=${computedValue}`
      } else {
        return `${UTM_TYPES[type]}=${computedValue}`
      }
    })

    const utmString = utmList.join("&") //might use querystring to make sure there are no extra characters slipping in
    return utmString
  },

}
