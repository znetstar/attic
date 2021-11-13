import Location, { LocationSchema, ILocation } from '../Location';
import Entity, {IEntity} from '../Entity';
import { IDriver} from "@znetstar/attic-common/lib/IDriver";
import { IHTTPResourceEntity } from '../Entities/HTTPResourceEntity'
import {IHttpContext, IHTTPResponse} from "./HTTPCommon";
import { Document } from 'mongoose';
import Constructible from "../Constructible";
import Driver from "./Driver";
import * as _ from 'lodash';
import {IUser} from "../User";

export abstract class HTTPDriverBase extends Driver<IHTTPResponse> {
    constructor(public user?: IUser) {
        super(user);
    }

    protected defaultHeaders(httpContext?: IHttpContext): Map<string, string> {
        let headers = new Map<string, string>();

        let authorization = httpContext?.scopeContext?.currentScopeAccessToken?.authorizationHeader;

        if (authorization)
            headers.set('Authorization', authorization);

        return headers;
    }
}