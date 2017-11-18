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
    "DRAFT", //not sure when it would be a draft...or what difference it would make?
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
      channels: [
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
      }
      //appsecret is automatically set (?)
    },
    //GITHUB: 'github',
    GOOGLE: {
      name: 'Google',
      providerId: 'GOOGLE',
      channels: []
    },
    LINKEDIN: {
      name: 'LinkedIn',
      providerId: 'LINKEDIN',
      channels: [
        "PERSONAL_POST",
        //"PRIVATE_MESSAGE",
        "GROUP_POST",
        "PAGE_POST", //mostly for businesses
      ]
    },
    TWITTER: {
      name: 'Twitter',
      providerId: 'TWITTER',
      channels: [
        "PERSONAL_POST", //tweet. distinct from business post?
        "PRIVATE_MESSAGE",
      ]
    },
  },


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

