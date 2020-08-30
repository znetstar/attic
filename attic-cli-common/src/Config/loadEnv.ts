// @ts-ignore
{
    /**
     * An array of all valid environment variables
     * @constant
     * @type {string[]}
     */
    const envWhitelist: any[] = [
        'SERVER_URI',
        'VERBOSE',
        'OUTPUT_FORMAT',
        'LOG_RPC_STACK',
        'LOG_RPC_PROTOCOL_ERRORS'
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
