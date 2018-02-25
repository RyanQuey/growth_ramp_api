//TODO namespace consants by traffic search type, rather than properties
//gaAdditionalProperties: additional properties on the GA report request for a given report type
//
//gaDimensionSets dimensions to add to the shared dimensions for a reportSet for GA
module.exports.REPORT_TYPES = {
  ///////////////////////////////
  //start with traffic reports
  //NOTE not tested any of these yet
  totalTraffic: {
    gaAdditionalProperties: false, //no filter for this
    gaDimensionSets: false,
  },

  socialTraffic: {
    gaAdditionalProperties: false, //no filter for this
    //gaDimensionSets: [{name: "ga:hasSocialSourceReferral"}], // was extracting this to get social referral traffic,
    gaAdditionalProperties: {
      /*dimensionFilterClauses: { //this works too...but unnecessary
        operator: "OR",
        filters: [
          {
            dimensionName: "ga:medium",
            operator: "REGEXP",
            // haven't tested
            expressions: ["^(social|social-network|social-media|sm|social network|social media)$"],
          },
          {
            dimensionName: "ga:hasSocialSourceReferral", //NOTE might try using filtersExpression instead of dimensionFilterClauses since that is a string query
            operator: "EXACT",
            // haven't tested
            expressions: ["Yes"],
          },
        ],
      },*/
      dimensionFilterClauses: {
        filters: [
          {
            dimensionName: "ga:channelGrouping",
            operator: "EXACT",
            // haven't tested
            expressions: ["Social"],
          },
        ],
      },
    },
  },

  referralTraffic: {
    gaAdditionalProperties: {
      dimensionFilterClauses: {
        filters: [
          {
            dimensionName: "ga:channelGrouping",
            operator: "EXACT",
            expressions: ["Referral"], //gets referral traffic. Will remove social referrals manually later
          },
        ],
      },
    },
    gaDimensionSets: [{name: "ga:hasSocialSourceReferral"}],// {name: "ga:fullReferrer"}], //full url of referring webpage, if exists
  },

  directTraffic: {
    gaAdditionalProperties: {
      dimensionFilterClauses: {
        operator: "AND",
        filters: [
          {
            dimensionName: "ga:source",
            operator: "EXACT",
            expressions: ["direct"], //gets direct traffic
          },
          {
            dimensionName: "ga:medium",
            operator: "IN_LIST",
            expressions: ["(none)", "(not set)"], //gets direct traffic
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
  singlePageSeoReport: {
    gscDimensionFilterGroups: [ //not using yet, but this is what it will look like roughly
      {
        //groupType: not supported yet
        filters: [
          {
            dimension: "page",
            operator: "contains",
            expression: ["organic"],

          }
        ]
      },
    ]
  },

}
module.exports.METRICS_SETS = {
  behavior: [
    {expression: "ga:pageviews"},
    {expression: "ga:uniquePageviews"},
    {expression: "ga:bounceRate"},
    {expression: "ga:avgTimeOnPage"},
    {expression: "ga:exitRate"},
  ],
  acquisition: [
    {expression: "ga:impressions"},
    {expression: "ga:CTR"},
    {expression: "ga:CPC"},
    {expression: "ga:sessions"},
    // to get average position, use GSC api https://developers.google.com/webmaster-tools/search-console-api-original/v3/how-tos/search_analytics
    // not available in GA (multiple sources confirm)
  ],
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
