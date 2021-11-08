    require('dotenv').config();
import * as fs from 'fs-extra';
import * as path from 'path';
import { Provider } from 'nconf';
const yargs = <any>require('yargs');
import { default as DefaultConfig } from './DefaultConfig';
import Config from './Config';


let nconf: Provider&Config = (new Provider()) as any;
const pkg: any = JSON.parse(fs.readFileSync(__dirname+'/../../package.json', 'utf8')) ;

const overrides = (global as any).atticConfig || {};

nconf.overrides(overrides);

require('./loadEnv')(nconf);

let configFile = nconf.get('file');

if (configFile) {
    if (!fs.existsSync(configFile)) {
        console.error(`[global]: config file "${configFile}" does not exist. exiting.`);
        process.exit(1);
    }
    nconf.file('custom', { file: configFile });
} else {
    nconf.use('memory');
}

nconf.defaults(DefaultConfig);

const configHandler = {
    get: function (obj: any, prop: any) {
        const { nconf } = obj;

        if (prop === 'nconf' || prop === 'config')
            return nconf;

        if (prop in nconf)
            return nconf[prop];

        return nconf.get(prop);
    },
    set: function (obj: any, prop: any, value: any) {
        const { nconf } = obj;

        if (prop === 'nconf' || prop === 'config' || (prop in nconf))
            return;

        return nconf.set(prop, value);
    },
    has: function (obj: any, prop: any) {
        const { nconf } = obj;

        return (prop === 'nconf' || prop === 'config' || (prop in nconf) || Boolean(nconf.get(prop)));
    },

};

interface nconfHolder { nconf: Provider; }
const config = <Config&Provider&nconfHolder>(new Proxy(<Config&Provider&nconfHolder>(<any>{ nconf }), configHandler));
export default config;
