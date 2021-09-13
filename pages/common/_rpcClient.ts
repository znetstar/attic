import EncodeTools, {IDFormat} from '@etomon/encode-tools/lib/EncodeTools';
import {Client, HTTPClientTransport,RPCProxyManager} from 'multi-rpc-browser';
import {makeSerializer} from "./_encoder";
import {MarketplaceAPI} from "./_rpcCommon";


/**
 * Base URI of the RPC endpoint
 */
const BASE_URI = '/api/rpc';
/**
 * The `multi-rpc` transport used throughout the application
 */
export const rpcTransport = new HTTPClientTransport(makeSerializer(), BASE_URI);

/**
 * The `multi-rpc` Client object
 */
export const rpcClient = new Client(
  rpcTransport
);

/**
 * An easy to use proxy object layer that sits on top of the multi-rpc  client
 * @param onError
 * @constructor
 */
export function RPCProxy(onError?: (err: Error) => void): MarketplaceAPI {
  const manager = new RPCProxyManager<MarketplaceAPI>(rpcClient);
  if (onError) manager.on('error', onError);
  manager.on('invoke', () => {
    rpcTransport.headers.set(`x-marketplace-idempotency-key`, EncodeTools.WithDefaults.uniqueId(IDFormat.uuidv4String).toString())
  });
  return manager.createProxy();
}

export default RPCProxy;
