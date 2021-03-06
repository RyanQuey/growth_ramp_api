const env = process.env
const domain = process.env.CLIENT_URL || 'http://www.local.dev:5000'
const callbackPath = process.env.PROVIDER_CALLBACK_PATH || '/provider_redirect'
const callbackUrl = domain + callbackPath

module.exports = {
  ACCOUNT_SUBSCRIPTION_STATUSES: [
    "ACTIVE",
    "ARCHIVED"
  ],
  POST_TEMPLATE_STATUSES: [
    "ACTIVE",
    "ARCHIVED"
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
    "PARTIALLY_PUBLISHED", //if some but not all posts are published
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
            /*SELF: { //Jason said we'd never use this
              label: "Yourself",
              requirements: { //
                "NO_PHOTO": true,
              }
            },*/
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
    REDDIT: {
      name: 'Reddit',
      unsupported: true,
      providerId: 'REDDIT',
      channelTypes: {
        PERSONAL_POST: { //TODO these are fake figures
          name: "Personal",
          requiredScopes: [],
          hasMultiple: false,
          maxImages: 4,
          maxCharacters: 280,
        },
      },
    },
    SLACK: {
      name: 'Slack',
      unsupported: true,
      providerId: 'SLACK',
      channelTypes: {
        CHAT_CHANNEL: { //TODO these are fake figures
          name: "Slack Channel",
          requiredScopes: [],
          hasMultiple: true,
        },
      },
      forums: { // for slack, these are workspaces. Other chatrooms have these as subdomains
        name: "Workspace", //friendly name
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
    "CHAT_CHANNEL",
  ],

  ALL_POSTING_AS_TYPES: [
    "SELF",
    "PAGE",
  ],

  //all properties shared by a post and its template
  TEMPLATE_PROPERTIES: [
    "channelId",
    "channelType",
    "providerAccountId",
    "provider",
    "userId",
    "campaignUtm",
    "mediumUtm",
    "sourceUtm",
    "contentUtm",
    "termUtm",
    "pseudopost",
    //"customUtm",
  ],

  UTM_TYPES: {
    campaignUtm: "utm_campaign",
    mediumUtm: "utm_medium",
    sourceUtm: "utm_source",
    contentUtm: "utm_content",
    termUtm: "utm_term",
    //customUtm: "utm_custom",
  },

//TODO when change it here, must change it in frontend!!
//currently, just allows them to continue use even when they have no plan. then when their time is over, when they login they'll be prompted to add data, and b/c backend knows it too, no more campaigns can get published
  ALLOWED_EMAILS: [
    // ***REMOVED****
  ],

}


      //keep this in sync with the frontend constants

