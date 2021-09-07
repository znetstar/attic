import NextAuth, {Account, Profile as ProfileBase, Session, User as UserBase} from 'next-auth'
import Providers from 'next-auth/providers';
import atticConfig from '../../../misc/attic-config/config.json';
import {JWT} from "next-auth/jwt";
import { IUser as AtticUser} from '@znetstar/attic-common';
import {
  IFormalAccessToken,
  IFormalAccessToken as AtticAccessToken
} from '@znetstar/attic-common/lib/IAccessToken';
import levelup from 'levelup';
import { IORedisDown } from '@etomon/ioredisdown';
import { OAuthAgent } from "@znetstar/attic-cli-common/lib/OAuthAgent";
import Redis from 'ioredis';
import {IPOJOUser, IUser, toUserPojo, User as MarketplaceUser} from "../../common/_user";
import { Document } from 'mongoose';
import fetch  from 'node-fetch';
import {
  toPojo
} from '@thirdact/to-pojo';
import {encodeOptions} from "../../common/_encoder";
/**
 * Connection to redis used for session stuff
 */

export const sessionRedis = new Redis(process.env.SESSION_REDIS_URI);
export const sessionDb = levelup(new IORedisDown('blah', encodeOptions() as any, { redis: sessionRedis } as any));


/**
 * Represents a DB entry into the Login Server (aka a third-party service to login to)
 */
export interface DBInitRecord {
  document: {
    /**
     * The OAuth Client ID
     */
    clientId: string,
    /**
     * The OAuth Client Secret
     */
    clientSecret: string,
    /**
     * The OAuth Redirect URI
     */
    redirectUri: string,
    /**
     * The OAuth Scope
     */
    scope?: string[]|string[],
    /**
     * Either "provider" for third-party service or "consumer" for the current server
     */
    role?:  string[]
    /**
     * Provider Name (like "google")
     */
    name: string;
  }
}

export type DBInitRecordWithAgent = DBInitRecord&{
  /**
   * The OAuth agent can be used to get new access tokens from refresh tokens
   */
  agent: OAuthAgent
}

const {
  ATTIC_URI: atticUri,
  ATTIC_LOCAL_CLIENT_ID: atticLocalClientId,
  ATTIC_LOCAL_CLIENT_SECRET: atticLocalClientSecret,
  ATTIC_LOCAL_REDIRECT_URI: atticLocalRedirectUri
} = process.env as { [name: string]: string };

const { DEFAULT_USER_SCOPE } = atticConfig;

function agentFromRecord(record: DBInitRecord|DBInitRecordWithAgent): OAuthAgent {
  return new OAuthAgent(
    atticUri as string,
    {
      redirect_uri: record.document.redirectUri,
      client_secret: record.document.clientSecret,
      client_id: record.document.clientId
    },
    sessionDb
  )
}

/**
 * OAuth Consumer used for email/password login
 */
const localRecord: DBInitRecordWithAgent = {
  "document": {
    "clientId": atticLocalClientId as string,
    "clientSecret": atticLocalClientSecret as string,
    "redirectUri": atticLocalRedirectUri as string,
    "scope": DEFAULT_USER_SCOPE,
    "role": [
      "consumer"
    ],
    name: 'local'
  },
  agent: null as any
}

localRecord.agent = agentFromRecord(localRecord);

/**
 * A list of all OAuth Consumers by name
 */
export const oauthConsumerByName = new Map<string, DBInitRecordWithAgent>(
  atticConfig.dbInit
    .filter((c: any) => {
      return c.document.role.includes('consumer');
    })
    .map(c => [
      c.document.clientId,
      ({
        ...c as DBInitRecord,
        agent: agentFromRecord(c)
      })
    ])
);

oauthConsumerByName.set('local', {
  ...localRecord,
  agent: agentFromRecord(localRecord)
})
/**
 * A list of all OAuth Providers by name
 */
export const oauthProviderByName = new Map<string, DBInitRecord>(
  atticConfig.dbInit
    .filter((c: any) => {
      return c.document.role.includes('provider');
    })
    .map(c => [
     c.document.clientId, c as DBInitRecord
  ])
);

const scope = DEFAULT_USER_SCOPE.join(' ');

/**
 * Profile information as retrieved upon login
 */
export type User = UserBase & {
  atticUser: AtticUser,
  marketplaceUser: IPOJOUser
};

/**
 * Data to be stored in the session object. This data persists between page changes
 */
export interface MarketplaceSessionData {
  user?: User
}

/**
 * JWT Token (this just actually wraps the attic access token)
 */
export type MarketplaceToken = JWT&{
  atticAccessToken: AtticAccessToken;
  provider: string;
  atticUserId: string;
  userId: string;
};

export type MarketplaceSession = Session&{
  token: MarketplaceToken;
  data: MarketplaceSessionData;
  user: User,
  /**
   * Save the session data to redis
   */
  save: () => Promise<void>;
  /**
   * Load the session data from redis
   */
  load: () => Promise<void>;

  getAtticAgent(): OAuthAgent;
};

async function syncUser(atticUser: AtticUser): Promise<Document<IUser>> {
  let marketplaceUser: Document<IUser>|null = await MarketplaceUser.findOne({ atticUserId: atticUser._id }).exec();

  if (!marketplaceUser) {
    let doc: any = {
      atticUserId: atticUser._id
    };
    if (atticUser.identities[0]) {
      doc.firstName = atticUser.identities[0].firstName;
      doc.lastName = atticUser.identities[0].lastName;
      doc.email = atticUser.username
    }
    const firstName = atticUser.identities[0]
    marketplaceUser = await MarketplaceUser.create(doc);
  }

  return marketplaceUser as Document<IUser>;
}

export async function ensureUser(
  input: MarketplaceToken|MarketplaceSession,
  opts: { user?: User, session?: MarketplaceSession, account?: Account } = {}
): Promise<{ marketplaceUser: IUser, atticUser: AtticUser, token: MarketplaceToken }> {
  let { user, session, account } = opts;
  let token: MarketplaceToken;
  if ((input as MarketplaceSession)?.token) {
    token = (input as MarketplaceSession)?.token;
    session = input as MarketplaceSession;
  } else {
    token = input as MarketplaceToken;
  }

  const provider = oauthConsumerByName.get((token.provider ? token.provider : account?.provider) as string) as DBInitRecordWithAgent;

  if (!provider.agent) {
    throw  new Error(`Invalid provider ${account?.provider}`);
  }

  let marketplaceUser: IUser|undefined;
  let   atticUser: AtticUser|undefined;

  if (session) {

    if (session?.data?.user) {
      marketplaceUser = session?.data?.user.marketplaceUser;
      atticUser = session?.data?.user.atticUser;
    }
  }

  if (!marketplaceUser || !atticUser) {
    // Here we used to saved refresh token to attempt a refresh
    // If no refresh is needed, the library will just return the existing token
    const atticAccessToken = token.atticAccessToken = (await provider.agent.ensureToken({
      refresh_token: (token.atticAccessToken?.refresh_token || account?.refresh_token) as string,
      client_id: provider.document.clientId,
      client_secret: provider.document.clientSecret,
      grant_type: 'refresh_token',
      scope,
      redirect_uri: provider.document.redirectUri
    }));
  }

  token.provider = (token.provider || account?.provider) as string;

  return {
    marketplaceUser:  marketplaceUser as IUser,
    token,
    atticUser: atticUser as AtticUser
  };
}

type Profile = ProfileBase&{
  atticAccessToken: IFormalAccessToken
};

export default NextAuth({
  jwt: {
    signingKey: process.env.JWT_SIGNING_PRIVATE_KEY
  },
  session: {
  },
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/error',
    newUser: '/signup'
  },
  callbacks: {
    async redirect(url: string, baseUrl: string) {
      return baseUrl;
    },
    /**
     * This method is called upon each page change AND/OR successful login
     * Really we just need to check if the Attic Access Token is valid, and if it
     * isn't to attempt to refresh.
     * @param token
     * @param user
     * @param account
     * @param profile
     * @param isNewUser
     */
    async jwt(token: MarketplaceToken, user?: User, account?: Account, profile?: Profile, isNewUser?: boolean): Promise<MarketplaceToken>  {
      if (token?.userId || user?.marketplaceUser) token.userId  =user?.marketplaceUser._id.toString() as string ||  token.userId;
      if (token?.atticUserId || user?.atticUser._id || token.atticUserId) token.atticUserId =  user?.atticUser._id || token.atticUserId;
      if (user?.atticAccessToken) (token as any).atticAccessToken = user?.atticAccessToken;
      else if (account) token.atticAccessToken = account as unknown as IFormalAccessToken;
      if (!token.provider && !account?.provider) {
        token.provider = 'marketplace-local';
      }
      if (account?.provider)
        token.provider = account.provider;

      return token;
    },
    /**
     * This method restores the session from the datastore (redis) upon each page change.
     * It's up to the developer (you) to save the data after modification using `session.save()`
     * @param session
     * @param token
     */
    async session(session: MarketplaceSession, token: MarketplaceToken): Promise<MarketplaceSession> {
      session.token = token;

      // session.save = async function () {
      //   // The refresh token is used as a session key, so sessions persist between token refreshes
      //   await sessionDb.put(session.token.atticAccessToken?.refresh_token, session.data);
      // }

        function getAtticAgent() {
          const agent = oauthConsumerByName.get(session.token.provider) as DBInitRecordWithAgent;
          return agent. agent;
        }

        session.getAtticAgent = getAtticAgent;

        const agent = session.getAtticAgent();
        if (!session.user?.atticUser) {
        const { RPCProxy: rpcProxy } = agent.createRPCProxy({} as any, {
          headers: [
            [ 'Authorization', `Bearer ${session.token.atticAccessToken.access_token as any}`]
          ]
        } as any);

        const atticUser = await rpcProxy.getSelfUser() as AtticUser;

        const marketplaceUser = toUserPojo(await syncUser(atticUser));
        session.user = {
          name: atticUser.username,
          email: atticUser.username,
          atticUser,
          marketplaceUser
        };
      }
      else if (!session.user?.marketplaceUser) {
        session.user.marketplaceUser = toUserPojo(await syncUser(session.user.atticUser));
      }

      // session.load = async function ()  {
      //   let data: MarketplaceSessionData = {};
      //   try {
      //     // The refresh token is used as a session key, so sessions persist between token refreshes
      //     data = (await sessionDb.get(session.token.atticAccessToken?.refresh_token)) as MarketplaceSessionData;
      //   } catch (err)  {
      //     if (!err.notFound) {
      //       throw err;
      //     }
      //   } finally {
      //     session.data = data;
      //   }
      // }

      return toPojo<any, any>(session);
    }
  },
  providers: [
    Providers.Credentials({
      name: 'Email',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "user" },
        password: {  label: "Password", type: "password" }
      },
      /**
       * When the "credential" provider (email/password) is used to login
       * we'll request an attic access token with the "password" grant.
       *
       * Otherwise the logic is the same for third-party  OAuth ("authorization_code") login.
       * @param credentials
       * @param req
       */
      async authorize(credentials, req): Promise<Profile|null> {
        try {
          //  Use the local agent to get an access token
          const tokenResp = await fetch(`${process.env.ATTIC_URI}/auth/token`, {
            method: 'POST',
            body: JSON.stringify({
              "username": credentials.username,
              "password": credentials.password,
              "grant_type": "password",
              "client_id": atticLocalClientId,
              "client_secret": atticLocalClientSecret,
              "redirect_uri": atticLocalRedirectUri,
              scope: scope
            }),
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (tokenResp.status === 403) {
            throw {
              httpCode: 403,
              message: 'Invalid email or password'
            };
          } else if (tokenResp.status !== 200) {
            throw {
              httpCode: 500,
              message: 'Unexpected login error'
            };
          }

          const token: IFormalAccessToken = await tokenResp.json();

          // Use the RPC interface to get the current user
          // @ts-ignore
          const {RPCProxy: atticRpc, RPCClient: atticClient} = localRecord.agent.createRPCProxy({}, {
            headers: [
              [ 'Authorization', `Bearer ${token.access_token}`]
            ]
          });


          const atticUser: AtticUser = await atticRpc.getSelfUser() as AtticUser;
          const marketplaceUser = await syncUser(atticUser);

          return {
            id: atticUser.id,
            atticAccessToken: token,
            name: atticUser.username,
            atticUser,
            marketplaceUser: marketplaceUser.toJSON() as unknown as IUser
          }
        } catch (err) {
          if (err.httpCode === 403) {
            err.message = 'Invalid email or password';
          }
          throw err;
        }
      }
    }),
    // These are really the same steps as the section immediately above, but we're
    // using NextAuths pre-build OAuth features to facilitate the OAuth flow and grab
    // the user data
    ...Array.from(oauthProviderByName.values()).map((record) => {
      const provider = record.document.name;
      const clientId = `marketplace-${provider}`;

      const  consumer = oauthConsumerByName.get(`marketplace-${provider}`);
      return {
        id: clientId,
        name: provider[0].toUpperCase() + provider.substr(1),
        type: "oauth",
        version: "2.0",
        scope,
        params: { grant_type: "authorization_code" },
        accessTokenUrl: `${atticUri}/auth/token`,
        requestTokenUrl: `${atticUri}/auth/${provider}/authorize`,
        authorizationUrl: `${atticUri}/auth/${provider}/authorize?response_type=code`,
        // This call (`/rest/User/self`) is identical to `rpcProxy.getSelfUser()`
        profileUrl: `${atticUri}/rest/User/self?populate=identities`,
        async profile(atticUser: AtticUser, tokens: any): Promise<Profile> {
          const resp = await fetch((process.env.ATTIC_URI as string) + '/rpc', {
            method: 'POST',
            body: JSON.stringify({
              id: (new Date()).getTime(),
              method: 'getSelfUser',
              params: [],
              jsonrpc:  '2.0'
            }),
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${tokens.accessToken}`
            }
          });

          const data = await resp.json();

          atticUser = (data).result;

          const marketplaceUser = await syncUser(atticUser);

          const marketplaceUserPojo = toUserPojo(marketplaceUser);

          return {
            id: atticUser.id,
            name: atticUser.username,
            email: atticUser.username,
            atticUser,
            marketplaceUser,
            atticAccessToken: tokens
          };
        },
        clientId: clientId,
        clientSecret: consumer?.document.clientSecret
      } as any;
    })
  ]
})
