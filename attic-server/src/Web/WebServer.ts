import * as express from 'express';
import { JSONSerializer, Response,  Transport, ClientRequest} from 'multi-rpc';
import { ExpressTransport } from 'multi-rpc-express-transport';
import ResolverMiddleware from './ResolverMiddleware';
import { RPCServer } from '../RPC';
import Config from '../Config';
import { Server as HTTPServer} from 'http';
import {Router} from "express";
import SessionMiddleware, {CookieMiddleware} from "./SessionMiddleware";
import AuthMiddlewares, {AuthMiddleware, initalizePassport, restrictScopeMiddleware} from "./AuthMiddleware";
import * as cookieParser from 'cookie-parser';
import ApplicationContext from "../ApplicationContext";
import {Application} from "typedoc";
import {GenericError} from "@znetstar/attic-common/lib/Error/GenericError";
import {IError} from "@znetstar/attic-common/lib/Error/IError";
import * as _ from 'lodash';

async function handleError(error: any, req: any, res: any) {
    if (error) console.error(error.stack);
    delete error.stack;
    let err: IError;
    if (Array.isArray(error) && typeof(error[0]) === 'number') {
        err = {
            code: 0,
            httpCode: error[0],
            message: error[1]
        };
    } else {
        err = {
            code: _.get(error, 'code') || _.get(error, '__proto__.constructor.code'),
            httpCode: _.get(error, 'httpCode') || _.get(error, '__proto__.constructor.httpCode'),
            message: _.get(error, 'message') || _.get(error, '__proto__.constructor.message')
        }
    }

    res.status(err.httpCode || 500).send({ error: err });
}

export class AtticExpressTransport extends ExpressTransport {

    protected onRequest(req: any, res: any) {
        const jsonData = (<Buffer>req.body);
        const rawReq = new Uint8Array(jsonData);

        const body = JSON.parse(jsonData.toString('utf8'));

        return restrictScopeMiddleware(
            `rpc.${body.method}`,
        )(req, res, (err: any) => {
            if (err) handleError(err, req ,res);
            else super.onRequest(req, res);
        });
    }
}

export let RPCTransport: AtticExpressTransport;
export let WebRouter: Router;


export let WebHTTPServer: HTTPServer;
export let WebExpress: any;

export async function loadWebServer() {
    await ApplicationContext.emitAsync('loadWebServer.start');
    WebExpress = express();
    WebHTTPServer = new HTTPServer(WebExpress);
    WebRouter = express.Router();


    WebExpress.use(AuthMiddleware);

    RPCTransport = new AtticExpressTransport(new JSONSerializer(), WebRouter);

    RPCServer.addTransport(RPCTransport);

    WebExpress.post('/rpc', WebRouter);

    if (Config.enableWebResolver) {
       WebExpress.use(CookieMiddleware);
        initalizePassport(WebExpress);
        ApplicationContext.emit('Web.AuthMiddleware.loadAuthMiddleware', AuthMiddlewares);
        WebExpress.use(ResolverMiddleware);
    }

    WebExpress.use((error: any, req: any, res: any, next: any) => {
        handleError(error, req, res);
    });

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