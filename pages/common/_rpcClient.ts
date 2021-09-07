import EncodeTools, {IDFormat} from '@etomon/encode-tools/lib/EncodeTools';
import {Client, HTTPClientTransport} from 'multi-rpc-browser';
import {MakeSerializer} from "./_encoder";
import {MarketplaceAPI} from "./_rpcCommon";

export const rpcTransport = new HTTPClientTransport(MakeSerializer(), '/api/rpc');
export const rpcClient = new Client(
  rpcTransport
);

export function RPCProxy(onError?: (err: Error) => void) {
  return new Proxy({} as MarketplaceAPI, {
    get(target: MarketplaceAPI, p: string | symbol, receiver: any): any {
      return async function rpcInvoke(...args: unknown[]): Promise<unknown> {
        rpcTransport.headers.set(`x-marketplace-idempotency-key`, EncodeTools.WithDefaults.uniqueId(IDFormat.uuidv4String).toString())
        try { return rpcClient.invoke(p.toString(), args); }
        catch (err) {
          if (onError) {
            onError(err);
            return;
          }
          throw err;
        }
      }
    },
    set(target: MarketplaceAPI, p: string | symbol, value: any, receiver: any): boolean {
      return false;
    },
    deleteProperty(target: MarketplaceAPI, p: string | symbol): boolean {
      return false;
    },
    has(target: MarketplaceAPI, p: string | symbol): boolean {
      return true;
    }
  })
}

export default RPCProxy;
