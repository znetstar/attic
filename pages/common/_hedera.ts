import {makeKeyEncoder} from "./_encoder";

export function wrapVirtual(schema: any, key: string, name?: string) {
  return schema.virtual(name ? name : `${key}Str`)
    .get(function () {
      // @ts-ignore
      return (this as any)[key] ? makeKeyEncoder().encodeBuffer((this as any)[key]) : (this as any)[key];
    })
    .set(function (val: string|Buffer) {
      schema[key] = makeKeyEncoder().decodeBuffer(val);
    });
}
