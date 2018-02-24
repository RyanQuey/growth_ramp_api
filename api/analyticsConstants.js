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
      dimensionFilterClauses: {
        operator: "OR",
        filters: [
          {
            dimensionName: "ga:medium",
            operator: "REGEXP",
            // haven't tested
            expressions: ["^(social|social-network|social-media|sm|social network|social media)$"],
          },
          {
            dimensionName: "ga:hasSocialSourceReferralmedium", //NOTE
            operator: "EXACT",
            // haven't tested
            expressions: ["Yes"],
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
        operator: "AND",
        filters: [
          {
            dimensionName: "ga:source",
            operator: "EXACT",
            expressions: ["direct"], //gets direct traffic
          },
        ],
        filters: [
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
  // defaults for the different datasets
module.exports.DATASETS = {
  "channel-traffic": {
    func: "generateChannelTrafficReportRequests",
  },
  "website-traffic": {
    func: "generateStandardReportRequests",
    defaultDimensions: [{name: "ga:channelGrouping"}],
  },
  "webpage-traffic": {
    func: "generateStandardReportRequests",
  },
  //for the line chart, which shows data change over time
  "chart-line-time": {
    func: "generateHistogramReportRequest",
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
