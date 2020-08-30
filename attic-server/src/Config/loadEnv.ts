// @ts-ignore
{
    /**
     * An array of all valid environment variables
     * @constant
     * @type {string[]}
     */
    const envWhitelist: any[] = [
        'MONGO_URI',
        'PORT',
        'HOST',
        'UNIX_SOCKET',
        'ENABLE_CACHE',
        'CACHE_SIZE',
        'CACHE_MAX',
        'ENABLE_WEB_RESOLVER',
        'WEB_RESOLVER_PORT',
        'WEB_RESOLVER_HOST',
        'WEB_RESOLVER_UNIX_SOCKET',
        'WEB_RESOLVER_SHARE_RPC_SERVER',
        'SHORT_URL_SIZE',
        'ROOT_RESOLVER_BATCH_SIZE'
    ];

    const noTransform: any[] = [

    ];

    function envToConfig(env: any) {
        let a = env.toLowerCase().split('_');
        let i = 1;
        while (i < a.length) {
            a[i] = a[i][0].toUpperCase() + a[i].substr(1);
            i++;
        }
        return a.join('');
    }

    const whitelist = envWhitelist.concat(envWhitelist.map(envToConfig));

    /**
     * Sets up nconf with the `env` store.
     * @param {Provider} nconf - Instance of `nconf.Provider`.
     * @returns {Provider} - Same instance of `nconf.Provider`.
     */
    function setupNconfEnv(nconf: any) {
        return nconf
            .env({
                whitelist,
                parseValues: true,
                transform: (obj: any) => {
                    if (envWhitelist.includes(obj.key) && !noTransform.includes(obj.key)) {
                        if (obj.key.indexOf('_') !== -1) {
                            obj.key = envToConfig(obj.key);
                        } else {
                            obj.key = obj.key.toLowerCase();
                        }

                        envWhitelist.push(obj.key);
                    }
                    return obj;
                }
            });
    };

    module.exports = setupNconfEnv;
}