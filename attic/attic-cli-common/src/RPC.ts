
import { Client, HTTPClientTransport, JSONSerializer } from 'multi-rpc';
import { default as IRPC }  from '@znetstar/attic-common/lib/IRPC';
import Config from './Config';
import {OAuthAgent} from "./OAuthAgent";

export const authAgent = OAuthAgent.fromConfig(Config);
authAgent.allowedGrants = [ 'client_credentials' ];

const { RPCProxy: rpcProxy, RPCClient: rpcClient }  = authAgent.createRPCProxy({
  username: Config.username,
  grant_type: 'client_credentials',
  scope: Config.defaultScope
});

export const RPCProxy = rpcProxy;
export const RPCClient = rpcClient;
export default RPCProxy;
