import {Request, Response} from "express";
import {IScopeContext} from "../Auth/AccessToken";

export interface IHTTPResponse {
    href: string;
    headers?: Map<string, string>;
    status: number;
    body?: Buffer;
    method: string;
}


export interface IHttpContext {
    req: Request,
    res: Response,
    scopeContext?: IScopeContext
}