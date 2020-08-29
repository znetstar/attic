import * as cliff from "cliff";
import * as _ from 'lodash';
const { flatten: flattenMongo } = require('mongo-dot-notation');

export enum OutputFormat {
  'text'= 'text',
  'json' = 'json'
}

export interface OutputFormatFlags {
  verbose?: boolean;
  format?: OutputFormat;
}

export function formatOutputFromFlags(objects: any, flags: OutputFormatFlags, restrictFields?: string[]) {
  return formatOutput(objects, flags.format, !flags.verbose ? restrictFields : void(0));
}

export function formatOutput(objects: any, format: OutputFormat = OutputFormat.text, restrictFields?: string[]) {
  objects = [].concat(objects);
  if (restrictFields && !_.isEmpty(restrictFields)) {
    objects = objects.map((o: any) => {
      let result: any = {}
      for (let field of restrictFields) {
         _.set(result, field, _.get(o, field));
      }
      return result;
    });
  }
  if (format === OutputFormat.text) {
    let rows = objects.map((o: any) => flattenMongo(o).$set);
    let keys: any[] = (restrictFields && !_.isEmpty(restrictFields)) ? restrictFields : _.uniq(_.flatten(rows.map((o: any) => Object.keys(o))));
    rows = rows.map((o: any) => {
      for (let k of keys) {
        if (typeof((o as any)[k as any]) === 'undefined') {
          (o as any)[k as any] = undefined;
        }
      }
      return o;
    })

    return cliff.stringifyObjectRows(rows, keys);
  } else if (format === OutputFormat.json) {
    return JSON.stringify(objects, null, 4);
  } else {
    return null;
  }
}
