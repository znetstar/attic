import NextAuth, {Account, Profile as ProfileBase, Session, User} from 'next-auth'
import Providers from 'next-auth/providers'
import fetch from 'node-fetch';
import atticConfig from '../../../misc/attic-config/config.json';
import {JWT} from "next-auth/jwt";
import {IRPC, IUser as AtticUser} from '@znetstar/attic-common';
import IAccessToken, { IFormalAccessToken as AtticAccessToken } from '@znetstar/attic-common/lib/IAccessToken';
import levelup from 'levelup';
import { IORedisDown } from '@etomon/ioredisdown';
import { OAuthAgent } from "@znetstar/attic-cli-common/lib/OAuthAgent";
import Redis from 'ioredis';
import { default as AtticClient } from '@znetstar/attic-common/lib/IClient';
/**
 * Connection to redis used for session stuff
 */
export const sessionRedis = new Redis(process.env.SESSION_REDIS_URI);
export const sessionDb = levelup(new IORedisDown('blah', {
  serializationFormat: 'cbor' as any
}, { redis: sessionRedis } as any));


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
export type Profile = ProfileBase & {
  atticUser: AtticUser
};

/**
 * Data to be stored in the session object. This data persists between page changes
 */
export interface MarketplaceSessionData {}

/**
 * JWT Token (this just actually wraps the attic access token)
 */
export type MarketplaceToken = JWT&{
  atticAccessToken: AtticAccessToken;
  provider: string;
  atticUserId: string;
};

export type MarketplaceSession = Session&{
  token: MarketplaceToken;
  data: MarketplaceSessionData;
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


export default NextAuth({
  session: {
    jwt: true
  },
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/login',
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
    async jwt(token: MarketplaceToken, user?: User, account?: Account, profile?: Profile, isNewUser?: boolean): Promise<MarketplaceToken> {
      const provider = oauthConsumerByName.get((token.provider ? token.provider : account?.provider) as string) as DBInitRecordWithAgent;

      if (!provider.agent) {
        throw  new Error(`Invalid provider ${account?.provider}`);
      }

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

      token.provider = (token.provider || account?.provider) as string;
      token.atticUserId = token.sub as string;

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

      session.save = async function () {
        // The refresh token is used as a session key, so sessions persist between token refreshes
        await sessionDb.put(session.token.atticAccessToken?.refresh_token, session.data);
      }

      session.getAtticAgent = () => oauthConsumerByName.get(`marketplace-${token.provider}`)?.agent as OAuthAgent;

      session.load = async function ()  {
        let data: MarketplaceSessionData = {};
        try {
          // The refresh token is used as a session key, so sessions persist between token refreshes
          data = (await sessionDb.get(session.token.atticAccessToken?.refresh_token)) as MarketplaceSessionData;
        } catch (err)  {
          if (!err.notFound) {
            throw err;
          }
        } finally {
          session.data = data;
        }
      }

      await session.load();
      return session;
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
          const token = await localRecord.agent.getAccessToken({
            "username": credentials.username,
            "password": credentials.password,
            "grant_type": "password",
            "client_id": atticLocalClientId,
            "client_secret": atticLocalClientSecret,
            "redirect_uri": atticLocalRedirectUri,
            scope
          }) as AtticAccessToken;

          // Use the RPC interface to get the current user
          const {RPCProxy: atticRpc} = localRecord.agent.createRPCProxy();
          const atticUser: AtticUser = await atticRpc.getSelfUser() as AtticUser;

          return {
            id: atticUser.id,
            name: atticUser.username,
            atticUser
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
        profileUrl: `${atticUri}/rest/User/self`,
        async profile(atticUser: AtticUser, tokens: any): Promise<Profile> {
          return {
            id: atticUser.id,
            name: atticUser.username,
            atticUser
          };
        },
        clientId: clientId,
        clientSecret: oauthConsumerByName.get(`marketplace-${provider}`)?.document.clientSecret
      } as any;
    })
  ]
})
