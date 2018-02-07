//TODO namespace consants by traffic search type, rather than properties
//additional properties for a given report type
module.exports.additionalProperties = {
  totalTraffic: false, //no filter for this
  socialTraffic: false, //no filter for this
  referralTraffic: {
    dimensionFilterClauses: {
      filters: [
        {
          dimensionName: "ga:medium",
          operator: "EXACT",
          expressions: ["referral"], //gets referral traffic. Will remove social referrals manually later
        },
      ],
    }
  },
  directTraffic: {
    dimensionFilterClauses: {
      filters: [
        {
          dimensionName: "ga:medium",
          operator: "EXACT",
          expressions: ["(none)"], //gets direct traffic
        },
      ],
    }
  },
  organicTraffic: {
    dimensionFilterClauses: {
      filters: [
        {
          dimensionName: "ga:medium",
          operator: "EXACT",
          expressions: ["organic"],
        },
      ],
    }
  },
}

//dimensions to add to the shared dimensions for a reportSet
module.exports.dimensionSets = {
  totalTraffic: false, //no additional dimension for these
  socialTraffic: [{name: "ga:hasSocialSourceReferral"}], // will extract this to get social referral traffic
  referralTraffic: [{name: "ga:hasSocialSourceReferral"}],// {name: "ga:fullReferrer"}], //full url of referring webpage, if exists
  directTraffic: false,
  organicTraffic: false,
}

//sample segment stuff

      /*segments: [
        {segmentId: "gaid::-5"}, //organic traffic
        {segmentId: "gaid::-7"}, //direct traffic
        /*{
          dynamicSegment: {
            name: "Traffic from Social Site",
            userSegment: {
              segmentFilters: [{
                simpleSegment: {
                  orFiltersForSegment: [{
                    segmentFilterClauses: [{
                      dimensionFilter:{
                        dimensionName: "ga:hasSocialSourceReferral", //can't use in segment, is banned
                        operator: "EXACT",
                        expressions: [true],
                      }
                    }]
                  }]
                }
              }]
            }
          }
        },*/
