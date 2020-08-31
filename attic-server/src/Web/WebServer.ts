import * as express from 'express';
import { JSONSerializer } from 'multi-rpc';
import { ExpressTransport } from 'multi-rpc-express-transport';
import ResolverMiddleware from './ResolverMiddleware';
import { RPCServer } from '../RPC';
import Config from '../Config';
import { Server as HTTPServer } from 'http';
import {Router} from "express";
import SessionMiddleware, {CookieMiddleware} from "./SessionMiddleware";
import AuthMiddlewares, {initalizePassport} from "./AuthMiddleware";
import * as cookieParser from 'cookie-parser';
import ApplicationContext from "../ApplicationContext";
import {Application} from "typedoc";

export let RPCTransport: ExpressTransport;
export let RPCRouter: Router;


export let RPCHTTPServer: HTTPServer;
export let RPCExpress: any;
export let WebHTTPServer: HTTPServer;
export let WebExpress: any;

export async function loadWebServer() {
    await ApplicationContext.emitAsync('loadWebServer.start');
    RPCExpress = express();
    RPCHTTPServer = new HTTPServer(RPCExpress);
    RPCRouter = express.Router();
    RPCTransport = new ExpressTransport(new JSONSerializer(), RPCRouter);
    RPCServer.addTransport(RPCTransport);
    RPCExpress.post('/rpc', RPCRouter);

    if (Config.enableWebResolver) {
        WebExpress = Config.webResolverShareRpcServer ? RPCExpress : express();
        WebHTTPServer = Config.webResolverShareRpcServer ? RPCHTTPServer : new HTTPServer(WebExpress);
        WebExpress.use(CookieMiddleware);
        WebExpress.use(SessionMiddleware);
        initalizePassport(WebExpress);
        ApplicationContext.emit('Web.AuthMiddleware.loadAuthMiddleware', AuthMiddlewares);
        WebExpress.use(ResolverMiddleware);
    }

    await ApplicationContext.emitAsync('loadWebServer.complete');
}

export async function webServerListen() {
    await ApplicationContext.emitAsync('webServerListen.start');
    if (Config.unixSocket) {
        RPCHTTPServer.listen(Config.unixSocket);
    } else if (Config.port) {
        RPCHTTPServer.listen(Config.port, Config.host);
    }

    if (Config.enableWebResolver && !Config.webResolverShareRpcServer) {
        if (Config.webResolverUnixSocket) {
            WebHTTPServer.listen(Config.webResolverUnixSocket);
        } else if (Config.webResolverPort) {
            WebHTTPServer.listen(Config.webResolverPort, Config.webResolverHost);
        }
    }
    await ApplicationContext.emitAsync('webServerComplete.complete');
}