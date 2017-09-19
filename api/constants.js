module.exports = {
  PLAN_STATUSES: [
    "DRAFT",
    "ACTIVE",
    "ARCHIVED"
  ],
  PROVIDER_STATUSES: [
    "ACTIVE",
    "ARCHIVED"
  ],
  POST_STATUSES: [
    "DRAFT",
    "PUBLISHED",
    "ARCHIVED"
  ],

  //all possible providers that can be in the provider column
  PROVIDERS: {
    FACEBOOK: {
      name: 'Facebook',
      providerId: 'facebook.com',
      channels: [
        "PERSONAL_POST",
        //"PRIVATE_MESSAGE",
        "GROUP_POST",
        "PAGE_POST",//mostly for businesses
        //"DARK_POST",
        //"BUSINESS_MESSAGE",
      ],
    },
    //GITHUB: 'github',
    GOOGLE: {
      name: 'Google',
      providerId: 'google.com',
      channels: []
    },
    LINKEDIN: {
      name: 'LinkedIn',
      providerId: 'linkedin.com',
      channels: [
        "PERSONAL_POST",
        //"PRIVATE_MESSAGE",
        "GROUP_POST",
        "PAGE_POST", //mostly for businesses
      ]
    },
    TWITTER: {
      name: 'Twitter',
      providerId: 'twitter.com',
      channels: [
        "PERSONAL_POST", //tweet. distinct from business post?
        "PRIVATE_MESSAGE",
      ]
    },
      //keep this in sync with the frontend constants
    TYPES: {
      USER_POST: "USER_POST"
    }
  },
}

