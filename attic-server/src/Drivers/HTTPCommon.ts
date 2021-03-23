import {Request, Response} from "express";
import {IScopeContext} from "../Auth/AccessToken";
import { IHTTPResponse as IHTTPResponseBase } from '@znetstar/attic-common/lib/IRPC';

export type IHTTPResponse = IHTTPResponseBase&{ body?: Buffer };

export interface IHttpContext {
    req: Request,
    res: Response,
    scopeContext?: IScopeContext
}
