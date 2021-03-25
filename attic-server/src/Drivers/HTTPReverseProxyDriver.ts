import Location, { LocationSchema, ILocation } from '../Location';
import Entity, {IEntity} from '../Entity';
import { IDriver} from "@znetstar/attic-common/lib/IDriver";
import { IHTTPResourceEntity } from '../Entities/HTTPResourceEntity'
import {IHTTPResponse} from "./HTTPCommon";
import { Document } from 'mongoose';
import Constructible from "../Constructible";
import Driver from "./Driver";
import * as _ from 'lodash';
import {IUser} from "../User";
import {HTTPDriverBase} from "./HTTPDriverBase";
import {Request, Response} from "express";
import * as HTTPProxy from 'http-proxy';
import { ServerOptions } from 'http-proxy';
import * as URL from 'url';
import {IDriverOfFull} from "../Driver";

export default class HTTPReverseProxyDriver extends HTTPDriverBase implements IDriverOfFull<IHTTPResponse, Buffer>{
    public httpProxy: HTTPProxy;
    constructor(public user?: IUser, protected proxyServerOptions?: ServerOptions) {
        super(user);

        this.httpProxy = HTTPProxy.createProxyServer(proxyServerOptions);
        this.httpProxy.on('proxyReq', this.onProxyReq);
    }

    protected onProxyReq = (proxyReq:  any, req: any, res: any, options: any) => {
        let headers = this.defaultHeaders({
            req,
            res,
            scopeContext: req.scopeContext
        });

        for (let [key,value] of headers) {
            proxyReq.setHeader(key, value);
        }
    }

    protected async proxyRequest(loc: ILocation&Document): Promise<IHTTPResponse|null> {
        let entity: IHTTPResourceEntity&IEntity&Document = loc.entity as IHTTPResourceEntity&IEntity&Document;
        let { req, res } = loc.httpContext;

        let headers = new Map<string,string>();
        if (_.isEmpty(entity)) {
            return {
                href: loc.href,
                headers,
                status: 410,
                method: req.method
            };
        } else {
            let targetUrl = URL.parse(entity.source.getHref(), true);
            targetUrl.query = req.query as any;

            let targetUrlFormatted = URL.format(targetUrl);

            this.httpProxy.web(req, res, {
                target: targetUrlFormatted,
                changeOrigin: true,
                secure: false,
                autoRewrite: true,
                ignorePath: true
            });

        }

        return null;
    }

    public async put(location: ILocation&Document, content: Buffer): Promise<IHTTPResponse|null> {
        return this.proxyRequest(location);
    }
    public async get(location: ILocation&Document): Promise<IHTTPResponse|null> {
        return this.proxyRequest(location);
    }
    public async head(location: ILocation&Document): Promise<IHTTPResponse|null> {
        return this.proxyRequest(location);
    }
    public async delete(location: ILocation&Document): Promise<IHTTPResponse|null> {
        return this.proxyRequest(location);
    }
    public async list(location: ILocation&Document): Promise<IHTTPResponse|null> {
        return this.proxyRequest(location);
    }
    public async proxy(location: ILocation&Document): Promise<IHTTPResponse|null> {
        return this.proxyRequest(location);
    }
}