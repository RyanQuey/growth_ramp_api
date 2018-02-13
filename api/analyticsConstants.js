//TODO namespace consants by traffic search type, rather than properties
//gaAdditionalProperties: additional properties on the GA report request for a given report type
//
//gaDimensionSets dimensions to add to the shared dimensions for a reportSet for GA
module.exports.reportTypes = {
  ///////////////////////////////
  //start with traffic reports
  totalTraffic: {
    gaAdditionalProperties: false, //no filter for this
    gaDimensionSets: false,
  },

  socialTraffic: {
    gaAdditionalProperties: false, //no filter for this
    gaDimensionSets: [{name: "ga:hasSocialSourceReferral"}], // will extract this to get social referral traffic,
  },

  referralTraffic: {
    gaAdditionalProperties: {
      dimensionFilterClauses: {
        filters: [
          {
            dimensionName: "ga:medium",
            operator: "EXACT",
            expressions: ["referral"], //gets referral traffic. Will remove social referrals manually later
          },
        ],
      },
    },
    gaDimensionSets: [{name: "ga:hasSocialSourceReferral"}],// {name: "ga:fullReferrer"}], //full url of referring webpage, if exists
  },

  directTraffic: {
    gaAdditionalProperties: {
      dimensionFilterClauses: {
        filters: [
          {
            dimensionName: "ga:medium",
            operator: "EXACT",
            expressions: ["(none)"], //gets direct traffic
          },
        ],
      },
    },
    gaDimensionSets: false,
  },

  organicTraffic: {
    gaAdditionalProperties: {
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
    gaDimensionSets: false,
  },

  ////////////////////////////////////////
  // SEO reports
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
