import * as express from 'express';
import { JSONSerializer, Response,  Transport, ClientRequest} from 'multi-rpc';
import { ExpressTransport } from 'multi-rpc-express-transport';
import ResolverMiddleware from './ResolverMiddleware';
import { RPCServer } from '../RPC';
import Config from '../Config';
import { Server as HTTPServer} from 'http';
import {Router} from "express";
import SessionMiddleware, {CookieMiddleware} from "./SessionMiddleware";
import AuthMiddlewares, {AuthMiddleware, restrictScopeMiddleware} from "./AuthMiddleware";
import * as cookieParser from 'cookie-parser';
import ApplicationContext, {ListenStatus} from "../ApplicationContext";
import {Application} from "typedoc";
import {GenericError} from "@znetstar/attic-common/lib/Error/GenericError";
import {IError} from "@znetstar/attic-common/lib/Error/IError";
import * as _ from 'lodash';
import {
    RPCError
} from 'multi-rpc';

interface HTTPErrorOpts { httpUrl?: string, httpMethod?: string; };

function prepareWebError(error: IError|Error|RPCError, httpOpts?: HTTPErrorOpts): IError {
    let err: IError&HTTPErrorOpts;
    if (Array.isArray(error) && typeof(error[0]) === 'number') {
        err = {
            code: 0,
            httpCode: error[0] || 500,
            message: error[1],
            stack: _.get(error, 'stack'),
            ...(httpOpts || {})
        };
    } else if ((error as RPCError).data)  {
        err = {
            code: _.get(error, 'data.code') || _.get(error, 'code'),
            httpCode: _.get(error, 'data.httpCode') || _.get(error, 'httpCode') || 500,
            message: _.get(error, 'data.message') || _.get(error, '.message'),
            stack: _.get(error, 'data.stack') || _.get(error, 'stack'),
            ...(httpOpts || {})
        }
    } else {
        err = {
            code: _.get(error, 'code') || _.get(error, '__proto__.constructor.code'),
            httpCode: _.get(error, 'httpCode') || _.get(error, '__proto__.constructor.httpCode') || 500,
            message: _.get(error, 'message') || _.get(error, '__proto__.constructor.message'),
            stack: _.get(error, 'stack'),
            ...(httpOpts || {})
        }
    }

    return err;
}

function processWebError(error: IError|Error|RPCError, httpOpts?: HTTPErrorOpts): IError {
    let err = prepareWebError(error, httpOpts);

    ApplicationContext.emit(`Error.WebServer`, err);

    return err;
}

async function handleError(error: any, req: any, res: any) {
    let err = processWebError(error, { httpMethod: req.method, httpUrl: req.originalUrl });

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
            else {
                const jsonData = (<Buffer>req.body);
                const rawReq = new Uint8Array(jsonData);
                const clientRequest = new ClientRequest(Transport.uniqueId(), (response?: Response) => {
                    const headers: any = {};

                    if (response) {
                        if (response.error) {
                            processWebError(response.error, {
                                httpMethod: req.method,
                                httpUrl: req.originalUrl
                            });
                        }
                        headers["Content-Type"] = this.serializer.content_type;

                        res.writeHead(200, headers);
                        res.end(this.serializer.serialize(response));
                    } else {
                        res.writeHead(204, headers);
                        res.end();
                    }
                }, { req, res });

                this.receive(rawReq, clientRequest);
            }
        });
    }
}

export let RPCTransport: AtticExpressTransport;
export let WebRouter: Router;


export let WebHTTPServer: HTTPServer;
export let WebExpress: any;

export async function loadWebServer() {
    await ApplicationContext.emitAsync('Web.loadWebServer.start');
    WebExpress = express();
    WebHTTPServer = new HTTPServer(WebExpress);
    WebRouter = express.Router();


    WebExpress.use(SessionMiddleware);
    WebExpress.use(AuthMiddleware);

    RPCTransport = new AtticExpressTransport(new JSONSerializer(), WebRouter);

    RPCServer.addTransport(RPCTransport);

    WebExpress.post('/rpc', WebRouter);

    if (Config.enableWebResolver) {
       WebExpress.use(CookieMiddleware);
        ApplicationContext.emit('Web.AuthMiddleware.loadAuthMiddleware', AuthMiddlewares);
        WebExpress.use(ResolverMiddleware);
    }

    WebExpress.use((error: any, req: any, res: any, next: any) => {
        handleError(error, req, res);
    });

    await ApplicationContext.emitAsync('Web.loadWebServer.start');
}


export async function webServerListen() {
    await ApplicationContext.emitAsync('Web.webServerListen.start');
    let urls: string[] = [];
    if (Config.unixSocket) {
        WebHTTPServer.listen(Config.unixSocket);
        urls.push(`http+unix:${Config.unixSocket}`);
    } else if (Config.port) {
        WebHTTPServer.listen(Config.port, Config.host);
        urls.push(`http://${Config.host}:${Config.port}`);
    }
    await ApplicationContext.emitAsync('Web.webServerListen.complete', {
        urls
    } as ListenStatus);
}