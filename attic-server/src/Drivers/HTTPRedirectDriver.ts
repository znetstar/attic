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

export default class HTTPRedirectDriver extends HTTPDriverBase {
    constructor(public user?: IUser) {
        super(user);
    }

    protected async getHead(loc: ILocation&Document, method: string = 'GET'): Promise<IHTTPResponse> {
        let entity: IHTTPResourceEntity&IEntity&Document = loc.entity as IHTTPResourceEntity&IEntity&Document;

        let headers = this.defaultHeaders(loc.httpContext);

        if (_.isEmpty(entity)) {
            return {
                href: loc.href,
                headers,
                status: 410,
                method
            };
        } else {
            headers.set('Location', entity.source.href);

            return {
                href: loc.href,
                headers,
                status: entity.status ? entity.status : 301,
                method
            };
        }
    }
    public async head(location: ILocation&Document): Promise<IHTTPResponse> {
        return this.getHead(location, 'HEAD');
    }

    public async get(location: ILocation&Document   ): Promise<IHTTPResponse> {
        return this.getHead(location, 'GET');
    }
}