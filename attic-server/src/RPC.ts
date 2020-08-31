import { Server } from 'multi-rpc';
import { IRPC }  from 'attic-common/src';
import Config from './Config';
import { nanoid } from 'nanoid';

export interface AtticRPCServer {
    methods: IRPC;
}


export const RPCServer = <AtticRPCServer&Server>(new Server());

RPCServer.methods.generateId = async function (size?: number): Promise<string> {
    return nanoid(Number(size) ? size : Config.shortUrlSize);
}

RPCServer.methods.listDrivers = async () => Config.drivers.slice(0);
RPCServer.methods.listResolverTypes = async () => Config.resolverTypes.slice(0);
RPCServer.methods.listEntityTypes = async () => Config.entityTypes.slice(0);
RPCServer.methods.listUserTypes = async () => Config.userTypes.slice(0);


export default RPCServer;
