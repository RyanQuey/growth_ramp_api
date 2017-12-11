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
      channelTypeTypes: [
        "PERSONAL_POST",
        //"PRIVATE_MESSAGE",
        "GROUP_POST",
        "PAGE_POST",//mostly for businesses
        //"DARK_POST",
        //"BUSINESS_MESSAGE",
      ],
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
    },
    //GITHUB: 'github',
    GOOGLE: {
      name: 'Google',
      providerId: 'GOOGLE',
      channelTypes: [],
      tokensExpire: true, //need to double check
      requiresAccessTokenSecret: false,
    },
    LINKEDIN: {
      name: 'LinkedIn',
      providerId: 'LINKEDIN',
      channelTypes: [
        "PERSONAL_POST",
        //"PRIVATE_MESSAGE",
        "GROUP_POST",
        "PAGE_POST", //mostly for businesses
      ],
      tokensExpire: true,
      requiresAccessTokenSecret: false,
    },
    TWITTER: {
      name: 'Twitter',
      providerId: 'TWITTER',
      channelTypes: [
        "PERSONAL_POST", //tweet. distinct from business post?
        "PRIVATE_MESSAGE",
      ],
      tokensExpire: false,
      requiresAccessTokenSecret: true,
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

