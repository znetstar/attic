import * as express from 'express';
import { JSONSerializer } from 'multi-rpc';
import { ExpressTransport } from 'multi-rpc-express-transport';
import ResolverMiddleware from './ResolverMiddleware';
import { RPCServer } from '../RPC';
import Config from '../Config';
import { Server as HTTPServer } from 'http';
import {Router} from "express";
import SessionMiddleware, {CookieMiddleware} from "./SessionMiddleware";
import AuthMiddlewares, {AuthMiddleware, initalizePassport, restrictScopeMiddleware} from "./AuthMiddleware";
import * as cookieParser from 'cookie-parser';
import ApplicationContext from "../ApplicationContext";
import {Application} from "typedoc";

export let RPCTransport: ExpressTransport;
export let WebRouter: Router;


export let WebHTTPServer: HTTPServer;
export let WebExpress: any;

export async function loadWebServer() {
    await ApplicationContext.emitAsync('loadWebServer.start');
    WebExpress = express();
    WebHTTPServer = new HTTPServer(WebExpress);
    WebRouter = express.Router();


    WebExpress.use(AuthMiddleware);

    RPCTransport = new ExpressTransport(new JSONSerializer(), WebRouter);
    RPCServer.addTransport(RPCTransport);

    WebExpress.use('/rpc', require('body-parser').json(), (req: any, res: any, next: any) => {
        if (req.body) {
            let body = req.body;
            if (body.method) {
                restrictScopeMiddleware(
                    `rpc.${body.method}`,
                )(req, res, next);

                return;
            }
        }

        res.status(403).end();
    });
    WebExpress.post('/rpc', WebRouter);

    if (Config.enableWebResolver) {
       WebExpress.use(CookieMiddleware);
        WebExpress.use(SessionMiddleware);
        initalizePassport(WebExpress);
        ApplicationContext.emit('Web.AuthMiddleware.loadAuthMiddleware', AuthMiddlewares);
        WebExpress.use(ResolverMiddleware);
    }

    // WebRouter.use((req: any, res: any, next: any, error: any) => {
    //     if (error) {
    //         res
    //     }
    // });

    await ApplicationContext.emitAsync('loadWebServer.complete');
}

export async function webServerListen() {
    await ApplicationContext.emitAsync('webServerListen.start');
    if (Config.unixSocket) {
        WebHTTPServer.listen(Config.unixSocket);
    } else if (Config.port) {
        WebHTTPServer.listen(Config.port, Config.host);
    }

    await ApplicationContext.emitAsync('webServerComplete.complete');
}