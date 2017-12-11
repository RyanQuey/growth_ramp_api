const env = process.env
const domain = process.env.CLIENT_URL || 'http://www.local.dev:5000'
const callbackPath = process.env.PROVIDER_CALLBACK_PATH || '/provider_redirect'
const callbackUrl = domain + callbackPath

module.exports = {
  POST_TEMPLATE_STATUSES: [
    "ACTIVE",
    "DISABLED",
  ],
  PLAN_STATUSES: [
    //"DRAFT", //not sure when it would be a draft...or what difference it would make?
    "ACTIVE",
    "ARCHIVED"
  ],
  PROVIDER_STATUSES: [
    "ACTIVE",
    "ARCHIVED"
  ],
  CAMPAIGN_STATUSES: [
    "DRAFT",
    "PUBLISHED",
    "ARCHIVED"
  ],

  //all possible providers that can be in the provider column
  PROVIDERS: {
    FACEBOOK: {
      name: 'Facebook',
      providerId: 'FACEBOOK',
      getAccessTokenUrl: `https://graph.facebook.com/v2.10/oauth/access_token?
        client_id=${env.CLIENT_FACEBOOK_ID}
        &redirect_uri=${callbackUrl}/facebook
        &client_secret=${env.CLIENT_FACEBOOK_SECRET}
        &code=
      `,
      options: {
        client_id: process.env.CLIENT_FACEBOOK_ID,
        client_secret: process.env.CLIENT_FACEBOOK_SECRET,
        redirect_uri: `${callbackUrl}/facebook`,
        //Promise: require('bluebird')//maybe want to do this?
        //scope: 'email, '
      },
      tokensExpire: true,
      //appsecret is automatically set (?)
      requiresAccessTokenSecret: false,
      channelTypes: {
        PERSONAL_POST: {
          name: "Personal",
          requiredScopes: ["publish_actions"],
          hasMultiple: false, //if there are a list of channels for this channelType
          maxImages: 4,
          maxCharacters: 63206,
        },
        //PRIVATE_MESSAGE: [probably friends, ],
        GROUP_POST: {
          name: "Group",
          requiredScopes: ["publish_actions", "user_managed_groups"],
          hasMultiple: true,
          maxImages: 4,
          maxCharacters: 63206,
        },
        PAGE_POST: {
          name: "Page",
          requiredScopes: ["manage_pages", "publish_pages", "pages_show_list"], //mostly for businesses
          hasMultiple: true,
          maxImages: 4,
          maxCharacters: 63206 ,
          //only putting this prop in constant if there's more than one type for now
          postingAsTypes: {
            SELF: {
              label: "Yourself",
              requirements: { //
                "NO_PHOTO": true,
              }
            },
            PAGE: {
              label: "Page",
              requirements: { //
                "ROLES": [
                  "CREATE_CONTENT",
                ]
              }
            },
          }
        },
      },
    },
    //GITHUB: 'github',
    GOOGLE: {
      name: 'Google',
      providerId: 'GOOGLE',
      channelTypes: {},
      tokensExpire: true, //need to double check
      requiresAccessTokenSecret: false,
    },
    LINKEDIN: {
      name: 'LinkedIn',
      providerId: 'LINKEDIN',
      tokensExpire: true,
      requiresAccessTokenSecret: false,
      channelTypes: {
        PERSONAL_POST: {
          name: "Personal",
          requiredScopes: ['w_share'],
          hasMultiple: false,
          maxImages: 1,
          maxCharacters: 500,
        },
        //PRIVATE_MESSAGE: [probably friends, ],
        //GROUP_POST: ['w_share'], discontinued: https://www.linkedin.com/help/linkedin/answer/81635/groups-api-no-longer-available?lang=en
        PAGE_POST: {
          name: "Company Page",
          requiredScopes: ['rw_company_admin'], //mostly for businesses https://developer.linkedin.com/docs/company-pages. Watch out, will want to check page settings to see if they have permitted it in their linkedIn accoutn
          hasMultiple: true,
          maxImages: 1,
          maxCharacters: 700,
        },
      }
    },
    TWITTER: {
      name: 'Twitter',
      providerId: 'TWITTER',
      tokensExpire: false,
      requiresAccessTokenSecret: true,
      channelTypes: {
        PERSONAL_POST: {
          name: "Personal",
          requiredScopes: [],//tweet. distinct from business post?
          hasMultiple: false,
          maxImages: 4,
          maxCharacters: 280,
        },
        //PRIVATE_MESSAGE:,, TODO want to support soon
        //  requiredScopes: [],//probably friends, ]
        //  hasMultiple: true,
        //  maxImages: 1,
        //  maxCharacters: 100*1000,
      },
    },
  },

  ALL_CHANNEL_TYPES: [
    "PERSONAL_POST",
    "PRIVATE_MESSAGE",
    "GROUP_POST",
    "PAGE_POST",
    "DARK_POST",
    "BUSINESS_MESSAGE",
  ],

  ALL_POSTING_AS_TYPES: [
    "SELF",
    "PAGE",
  ],

  UTM_TYPES: {
    campaignUtm: "utm_campaign",
    mediumUtm: "utm_medium",
    sourceUtm: "utm_source",
    contentUtm: "utm_content",
    termUtm: "utm_term",
    customUtm: "utm_custom",
  },
}
      //keep this in sync with the frontend constants

