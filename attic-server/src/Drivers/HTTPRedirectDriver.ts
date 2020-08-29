import Location, { ILocation } from '../Location';
import Entity, {IEntity} from '../Entity';
import {default as Driver, IDriver} from "attic-common/lib/IDriver";
import { IHTTPResourceEntity } from '../Entities/HTTPResourceEntity'
import {IHTTPResponse} from "./HTTPCommon";
import { Document } from 'mongoose';
import Constructible from "../Constructible";

export default class HTTPRedirectDriver extends Driver<IHTTPResourceEntity> {
    protected async getHead(loc: ILocation&Document, method: string = 'GET'): Promise<IHTTPResponse> {
        let entity: IHTTPResourceEntity&IEntity&Document =  await Entity.findById(loc.entity);

        let headers = new Map<string,string>();
        headers.set('Location', entity.source.href);

        return {
            href: loc.href,
            headers,
            status: 302,
            method
        };
    }
    public async head(location: ILocation&Document): Promise<IHTTPResponse> {
        return this.getHead(location, 'HEAD');
    }

    public async get(location: ILocation&Document   ): Promise<IHTTPResponse> {
        return this.getHead(location, 'GET');
    }
}