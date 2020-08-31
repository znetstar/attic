require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
import * as fs from 'fs-extra';
import * as path from 'path';
import { Provider } from 'nconf';
const yargs = <any>require('yargs');
import { default as DefaultConfig } from './DefaultConfig';
import { default as Config } from './Config';

let nconf: Provider&Config = (new Provider()) as any;
const pkg: any = JSON.parse(fs.readFileSync(__dirname+'/../../package.json', 'utf8')) ;

const overrides = {};

nconf.overrides(overrides);

let argvConfig =
    (<any>yargs)
        .version(pkg.version)
        .usage('Usage: attic-server')
        .options({
            f: {
                alias: 'file',
                describe: 'Path to a config file to use',
                demand: false
            }
        });

require('./loadEnv')(nconf);

nconf
    .argv(argvConfig);

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
export type ConfigType = Config&Provider&nconfHolder;
const config = <ConfigType>(new Proxy(<ConfigType>(<any>{ nconf }), configHandler));
export default config;