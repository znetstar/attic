import { Router } from 'express';
import {asyncMiddleware} from "./Common";
import {RootResolverSchema} from "../Resolvers/RootResolver";
import {ILocation} from "../Location";
import {IDriverFull,IDriverOfFull} from "../Driver";
import {IHTTPResponse} from "../Drivers/HTTPCommon";
import Constructible from "../Constructible";
import {resolve} from "../Resolver";
import * as _ from 'lodash';
import Config from "../Config";
import {IUser} from "../User";
import AuthMiddlewares from "./AuthMiddleware";

export default function ResolverMiddleware(req: any, res: any, next: any) {
    asyncMiddleware(async function (req: any, res: any) {
        if (req.originalUrl.substr(0, 5) === '/auth')
            return true;
        let href = ((req.headers && req.headers['x-forwarded-proto']) || req.protocol) + '://' + req.get('host') + req.originalUrl;

        const location = await resolve({ href });

        if (_.isEmpty(location) || !location) {
            return true;
        }

        if (Config.webResolverAuthenticateRequests) {
            if (!_.isEmpty(location.auth) && location.auth) {
                // if (!location.user && (location as any).$parent)
                //     await (location as any).$parent.populate('target.user').execPopulate();
                // else
                //     await location.populate('user').execPopulate();
                if (Config.webResolverPromptLogin) {
                    let middleware = AuthMiddlewares.get((location.user as IUser).type);

                    await new Promise((resolve, reject) => {
                        middleware(req, res, (err: any) => {
                            if (err) reject(err);
                            else resolve();
                        })
                    });
                }

                if (!req.user) {
                    res.sendStatus(401);
                    return;
                } else if (req.user.username !== location.auth.toString()) {
                    res.sendStatus(403);
                    return;
                }
            }
        }

        let Driver = <Constructible<IDriverOfFull<IHTTPResponse>>>(location.getDriver());
        let driver = new Driver();

        let response: IHTTPResponse;
        if (req.method === 'GET')
            response = await driver.get(location);
        else if (req.method === 'HEAD')
            response = await driver.head(location);
        else if (req.method === 'PUT')
            response = await driver.put(location, req.body);
        else if (req.method === 'DELETE')
            response = await driver.delete(location);
        else {
            response = {
                method: req.method,
                status: 405,
                href: location.href
            };
        }

        if (!response) {
            response =  {
                method: req.method,
                status: 404,
                href: location.href
            };
        }

        res.status(response.status);
        if (response.headers) {
            for (let k of Array.from(response.headers.keys())) {
                res.set(k, response.headers.get(k));
            }
        }
        if (response.body) {
            res.send(response.body);
        }

        res.end();
    })(req, res, next);
}