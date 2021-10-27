require('dotenv').config();

const clients = {
  'google': {
    "model": "Client",
    "query": { "name" : "google" },
    "document": {
      "clientId": process.env.GOOGLE_CLIENT_ID,
      "clientSecret": process.env.GOOGLE_CLIENT_SECRET,
      "redirectUri": process.env.GOOGLE_REDIRECT_URI,
      "authorizeUri": process.env.GOOGLE_AUTHORIZE_URI,
      "tokenUri": process.env.GOOGLE_TOKEN_URI,
      "scope": [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile"
      ],
      "role": [
        "provider",
        "registration"
      ],
      "name": "google",
      "locked": true,
    }
  }
};

const DEFAULT_USER_SCOPE = Object.freeze([
  "rpc.getSelfUser",
  "rpc.getAccessToken",
  "auth.authorize",
  "rpc.getSelfAccessTokensForScope",
  "rpc.deleteSelfEntities",
  "rpc.deleteSelfAccessTokens",
  "rpc.findSelfEntities",
  "rpc.getSelfIdentityEntityByAccessToken",
  'rest.User.self.get'
]);

const template =  {
  "clientId" : "marketplace-app",
  "name" : "marketplace-app",
  "redirectUri" : process.env.SITE_URI+"/api/auth/callback/marketplace-app",
  "scope" : DEFAULT_USER_SCOPE,
  "role" : [
    "consumer"
  ],
  "expireAccessTokenIn" : 604800000.0,
  "expireRefreshTokenIn" : 2592000000,
  "locked" : true
};
const now = new Date();
const dbInit = [
  {
    "model": "Client",
    "query": { "clientId": `marketplace-local` },
    replace: true,
    "document": {
      ...template,
      clientId: process.env[`ATTIC_LOCAL_CLIENT_ID`],
      clientSecret: process.env[`ATTIC_LOCAL_CLIENT_SECRET`],
      name: `marketplace-local`,
      redirectUri: process.env.NEXTAUTH_URL + process.env[`ATTIC_LOCAL_REDIRECT_URI`]
    }
  },
  ...[
    `^${ process.env.ATTIC_URI.replace(/\/\//g, '\\/\\/').replace(/\./g, '\\.') }`,
    `^${ process.env.USER_IMAGES_PUBLIC_URI.replace(/\/\//g, '\\/\\/').replace(/\./g, '\\.') }`
  ].map((regex) => ({
    "model": "Resolver",
    "query": {"mountPoint.regex": regex, isRootResolver: true},
    replace: true,
    "document": {
      "type": "RootResolver",
      "isRootResolver": true,
      "mountPoint": {
        "options": "",
        "regex": regex,
        "expression": `/${regex}/`
      },
      "priority": (0),
      "createdAt": now.getTime(),
      "updatedAt": now.getTime(),
      "__v": (0)
    }
  }))
  // }
];


for  (const clientId in clients) {
  const provider = clients[clientId];
  dbInit.push({
    "model": "Client",
    "query": { "clientId": `marketplace-${clientId}` },
    replace: true,
    "document": {
      ...template,
      clientId: `marketplace-${clientId}`,
      clientSecret: process.env[`ATTIC_${clientId.toUpperCase()}_CLIENT_SECRET`],
      name: `marketplace-${clientId}`,
      redirectUri: process.env.NEXTAUTH_URL + process.env[`ATTIC_${clientId.toUpperCase()}_REDIRECT_URI`]
    }
  }, provider)
}


module.exports = {
  enableIpfs: true,
  "rootUsername": process.env.ROOT_USERNAME,
  "rootGroups": process.env.ROOT_GROUPS ? process.env.ROOT_GROUPS.split(',') : void(0),
  "plugins": [
    "@etomon/attic-server-google",
    "@znetstar/attic-server-rest",
    "@znetstar/attic-server-s3",
    [
      '@thirdact/attic-marketplace-mods', '/opt/attic-marketplace-mods'
    ]
  ],
  siteUri: process.env.ATTIC_URI,
  DEFAULT_USER_SCOPE,
  // cors: {},
  dbInit//,
  // _oauth_clients_: clients
}
