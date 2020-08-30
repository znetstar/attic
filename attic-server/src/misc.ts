import * as _ from 'lodash';
import {Document} from "mongoose";
import * as MUUID from 'uuid-mongodb';

export function moveAndConvertValue(obj: any, startPath: string, endPath: string, convert?: any) {
    convert = convert || ((x: any): any => x);
    let value = _.get(obj, startPath);
    if (value) {
        let newValue = convert(value);
        _.set(obj, endPath, newValue);
        _.set(obj, startPath, void(0));
    }
}

export function parseUUIDQueryMiddleware() {
    let obj: any = this;
    return moveAndConvertValue(
       obj,
       `_conditions.id`,
       `_conditions._id`,
       (input: string) => MUUID.from(input)
   );
}