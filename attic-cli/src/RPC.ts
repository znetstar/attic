import { Client, HTTPClientTransport, JSONSerializer } from 'multi-rpc';
import { IRPC }  from 'attic-common/src';
import Config from './Config';

let serializer = new JSONSerializer();
let httpTransport = new HTTPClientTransport(serializer, Config.serverUri);

export interface RawRPCError {
  message:  string;
  stack?: string;
  code: number;
  data?: {
    stack?:  string;
    message: string;
    code?: string
  }
};

export class RPCError extends Error {
  constructor(errorObj: any) {
    super();

    this.message = errorObj.message;
    if (errorObj.data && errorObj.data.message) {
      this.message += "\n"+'Inner Error: '+errorObj.data.stack;
    }
  }
}

export const RPCClient = <Client>(new Client(httpTransport));
export const RPCProxy = new Proxy(<IRPC>{}, {
    get: function (target, property: string) {
        return async function (...args: any[]) {
          try {
            return await RPCClient.invoke(property, args);
          } catch (err) {
            throw new RPCError(err);
          }
        }
    },
    set: () => false,
    deleteProperty: () => false
});


export default RPCProxy;
