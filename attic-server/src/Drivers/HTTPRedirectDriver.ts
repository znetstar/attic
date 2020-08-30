import Location, { LocationSchema, ILocation } from '../Location';
import Entity, {IEntity} from '../Entity';
import { IDriver} from "attic-common/lib/IDriver";
import { IHTTPResourceEntity } from '../Entities/HTTPResourceEntity'
import {IHTTPResponse} from "./HTTPCommon";
import { Document } from 'mongoose';
import Constructible from "../Constructible";
import Driver from "./Driver";
import * as _ from 'lodash';

export default class HTTPRedirectDriver extends Driver<IHTTPResourceEntity> {
    constructor() {
        super();
    }
    protected async getHead(loc: ILocation&Document, method: string = 'GET'): Promise<IHTTPResponse> {
        await loc.populate('entity');
        let entity: IHTTPResourceEntity&IEntity&Document = loc.entity as IHTTPResourceEntity&IEntity&Document;

            let headers = new Map<string,string>();
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
                status: 302,
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