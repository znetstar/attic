import { default as ILocation} from "./ILocation";

export interface IMountPoint {
    regex?: string;
    options?: string;
    expression: string;
}

export default interface IResolver {
    id?: string;
    _id?: string;
    type?: string;
    mountPoint: IMountPoint;
    priority?: number;
    isRootResolver?: boolean;
}

export function defaultResolver(): IResolver {
    return {
        mountPoint: {
            expression: ''
        }
    };
}

export interface IPartialMountPointRegex {
    regex: string;
    options?: string;
    expression?: string;
}

export interface IPartialMountPointExpression {
    expression: string;
    regex?: string;
    options?: string;
}




export function ensureMountPoint(mountPoint: IMountPoint|IPartialMountPointExpression|IPartialMountPointRegex|string): IMountPoint {
    let expression: string, regex: string, options: string;
    if (typeof(mountPoint) === 'string') {
        mountPoint = { expression: mountPoint };
    }
    if ((mountPoint as IPartialMountPointExpression).expression  && !(mountPoint as IPartialMountPointExpression).regex) {
        expression = mountPoint.expression;
        let reg: RegExp = eval(expression);
        regex = reg.source;
        options = reg.flags || '';
    }
    else if (!(mountPoint as IPartialMountPointRegex).expression && (mountPoint as IPartialMountPointRegex).regex) {
        regex = mountPoint.regex;
        options = mountPoint.options;
        let reg: RegExp = new RegExp(regex, options);
        expression = reg.toString();
    }
    else {
        expression = mountPoint.expression;
        regex = mountPoint.regex;
        options = mountPoint.options;
    }

    if (!expression && !regex)
        return null;

    return {
        options,
        regex,
        expression
    };
}