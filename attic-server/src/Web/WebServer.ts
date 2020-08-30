import * as express from 'express';
import { JSONSerializer } from 'multi-rpc';
import { ExpressTransport } from 'multi-rpc-express-transport';
import resolverMiddleware from './ResolverMiddleware';
import { RPCServer } from '../RPC';
import Config from '../Config';
import { Server as HTTPServer } from 'http';
import {Router} from "express";

export let RPCTransport: ExpressTransport;
export let RPCRouter: Router;


export let RPCHTTPServer: HTTPServer;
export let RPCExpress: any;
export let WebHTTPServer: HTTPServer;
export let WebExpress: any;
RPCExpress = express();
RPCHTTPServer = new HTTPServer(RPCExpress);
RPCRouter = express.Router();
RPCTransport = new ExpressTransport(new JSONSerializer(), RPCRouter);
RPCServer.addTransport(RPCTransport);
RPCExpress.post('/rpc', RPCRouter);

if (Config.enableWebResolver) {
    WebExpress = Config.webResolverShareRpcServer ? RPCExpress : express();
    WebHTTPServer = Config.webResolverShareRpcServer ? RPCHTTPServer : new HTTPServer(WebExpress);
    WebExpress.use(resolverMiddleware);
}