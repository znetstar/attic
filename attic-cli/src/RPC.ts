import { Client, HTTPClientTransport, JSONSerializer } from 'multi-rpc';
import { IRPC }  from 'attic-common/src';
import Config from './Config';

let serializer = new JSONSerializer();
let httpTransport = new HTTPClientTransport(serializer, Config.serverUri);

export const RPCClient = <Client>(new Client(httpTransport));
export const RPCProxy = new Proxy(<IRPC>{}, {
    get: function (target, property: string) {
        return function (...args: any[]) {
            return RPCClient.invoke(property, args);
        }
    },
    set: () => false,
    deleteProperty: () => false
});


export default RPCProxy;
