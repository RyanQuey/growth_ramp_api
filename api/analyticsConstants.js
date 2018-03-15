//TODO namespace consants by traffic search type, rather than properties
//gaAdditionalProperties: additional properties on the GA report request for a given report type
//
//gaDimensionSets dimensions to add to the shared dimensions for a reportSet for GA
const REPORT_TYPES = {
  ///////////////////////////////
  //start with traffic reports
  //NOTE not tested any of these yet
  totalTraffic: {
    gaDimensionSets: false,
  },

  socialTraffic: {
    //gaDimensionSets: [{name: "ga:hasSocialSourceReferral"}], // was extracting this to get social referral traffic,
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
    gaDimensionFilterClauses: {
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

  referralTraffic: {
    gaDimensionFilterClauses: {
      filters: [
        {
          dimensionName: "ga:channelGrouping",
          operator: "EXACT",
          expressions: ["Referral"], //gets referral traffic. Will remove social referrals manually later
        },
      ],
    },
    gaDimensionSets: [{name: "ga:hasSocialSourceReferral"}],// {name: "ga:fullReferrer"}], //full url of referring webpage, if exists
  },

  directTraffic: {
    gaDimensionFilterClauses: {
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
    gaDimensionSets: false,
  },

  organicTraffic: {
    gaDimensionFilterClauses: {
      filters: [
        {
          dimensionName: "ga:medium",
          operator: "EXACT",
          expressions: ["organic"],
        },
      ],
    },
    gaDimensionSets: false,
  },

  emailTraffic: {
    gaDimensionFilterClauses: {
      filters: [
        {
          dimensionName: "ga:channelGrouping",
          operator: "EXACT",
          expressions: ["Email"], //gets referral traffic. Will remove social referrals manually later
        },
      ],
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
            expression: [""], //whatever the webpage is

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

module.exports.AUDIT_TESTS = {
  pageSpeed: {
    key: "pageSpeed",
    gaReports: [{
      dimensions: [{name: "ga:pagePath"}],
      metrics: [{expression: "ga:avgPageLoadTime"}, {expression: "ga:pageviews"}], //can max do 10 metrics at once
      orderBys: [
        {
          fieldName: "ga:avgPageLoadTime", //default to sorting by first metric
          sortOrder: "DESCENDING"
        }
      ],
    }],
  },

/*
  wellBalancedPortfolio: { //not using yet
    key: "wellBalancedPortfolio",
  },

  keywordTargets: {//not using yet
    key: "keywordTargets",
  },
*/
  headlineStrength: {
    key: "headlineStrength",
    gscReports: [
      {
        dimensions: ["page"],
      },
      {
        dimensions: [],
      },
    ],
  },

  browserCompatibility: {
    key: "browserCompatibility",
    gaReports: [{
      dimensions: [{name: "ga:browser"}],
      metrics: [{expression: "ga:users"}, {expression: "ga:bounceRate"}, {expression: "ga:avgSessionDuration"}],
    }],
  },

  deviceCompatibility: {
    key: "deviceCompatibility",
    gaReports: [{
      dimensions: [{name: "ga:deviceCategory"}],
      metrics: [{expression: "ga:users"}, {expression: "ga:bounceRate"}, {expression: "ga:avgSessionDuration"}],
    }],
  },

  // tests if bounce rate and session duration are disproprotionately bad, and goals (later) are not being met for pages
  // TODO might be able to find a way to combine with pageSpeed test
  userInteraction: {
    key: "userInteraction",
    gaReports: [{
      dimensions: [{name: "ga:landingPagePath"}],
      metrics: [{expression: "ga:bounceRate"}, {expression: "ga:avgSessionDuration"}, {expression: "ga:sessions"}],
    }],
  }, //eventually do all kinds of goals lists too, ga:goalXXConverionRate

  // hold off on working on, Jason is figuring out
  pageValue: {
    key: "pageValue",
    gaReports: [
      {
        dimensions: [{name: "ga:landingPagePath"}],
        metrics: [{expression: "ga:bounceRate"}, {expression: "ga:avgSessionDuration"}, {expression: "ga:sessions"}, {expression: "ga:transactionRevenue"}, {expression: "ga:revenuePerUser"}],
      },
      { // organic traffic
        dimensions: [{name: "ga:landingPagePath"}],
        dimensionFilterClauses: REPORT_TYPES.organicTraffic.gaDimensionFilterClauses,
        metrics: [{expression: "ga:sessions"}],
      },
      { // social traffic
        dimensions: [{name: "ga:landingPagePath"}],
        dimensionFilterClauses: REPORT_TYPES.socialTraffic.gaDimensionFilterClauses,
        metrics: [{expression: "ga:sessions"}],
      },
      { // organic traffic
        dimensions: [{name: "ga:landingPagePath"}],
        dimensionFilterClauses: REPORT_TYPES.referralTraffic.gaDimensionFilterClauses,
        metrics: [{expression: "ga:sessions"}],
      },
      { // email traffic
        dimensions: [{name: "ga:landingPagePath"}],
        dimensionFilterClauses: REPORT_TYPES.emailTraffic.gaDimensionFilterClauses,
        metrics: [{expression: "ga:sessions"}],
      },
    ],
  },

  searchPositionToImprove: {
    key: "pageValue",
    gscReports: [
      {
        dimensions: ["page"],
      },
      {
        dimensions: [],
      },
    ],
  },

  // https://www.rebelytics.com/404-errors-google-analytics/
  missingPages: {
    key: "missingPages",
    gaReports: [
      { // either from address bar or external link
        dimensions: [{name: "ga:pageTitle"}, {name: "ga:pagePath"}],
        metrics: [{expression: "ga:sessions"}],
        dimensionFilterClauses: {
          operator: "AND",
          filters: [
            {
              dimensionName: "ga:pageTitle",
              operator: "REGEXP",
              expressions: ["404|page not found"], //gets referral traffic. Will remove social referrals manually later
            },
            {
              dimensionName: "ga:previousPagePath",
              operator: "EXACT",
              expressions: ["(entrance)"], //gets referral traffic. Will remove social referrals manually later
            },
          ],
        }
      },
      { // this one gets internal links
        dimensions: [{name: "ga:pageTitle"}, {name: "ga:pagePath"}],
        metrics: [{expression: "ga:sessions"}],
        dimensionFilterClauses: {
          operator: "AND",
          filters: [
            {
              dimensionName: "ga:previousPagePath",
              operator: "EXACT",
              not: true,
              expressions: ["(entrance)"], //gets referral traffic. Will remove social referrals manually later
            },
            {
              dimensionName: "ga:pageTitle",
              operator: "REGEXP",
              expressions: ["404|page not found"], //gets referral traffic. Will remove social referrals manually later
            },
          ],
        }
      },
    ],
  },
}

module.exports.TEST_GROUPS = {
  all: ["pageSpeed", "headlineStrength", "browserCompatibility", "deviceCompatibility", "userInteractionGoals", "userInteraction", "pageValue", "pageValueGoals", "searchPositionToImprove", "missingPages"],
  nonGoals: ["pageSpeed", "headlineStrength", "browserCompatibility", "deviceCompatibility", "userInteraction", "pageValue", "searchPositionToImprove", "missingPages"],
  goals: ["userInteractionGoals", "pageValueGoals"],
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
module.exports.REPORT_TYPES = REPORT_TYPES
