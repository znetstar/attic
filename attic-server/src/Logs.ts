/**
 * @author Etomon Team <open-source@etomon.com>
 * @copyright 2021 Etomon, PBC
 */

import Config from './Config/index';

const winston = require('winston');
const {
    format: logFormat
} = winston;

export function createLogger() {
    const logger = (global as any).logger = winston.createLogger({
        format: logFormat.combine(
            logFormat((info: any) => {
                info.hostname = Config.hostname;
                return info;
            })()
        ),
        transports: [
            new (winston.transports.Console)({
                format: logFormat.combine(
                    logFormat.json()
                ),
                level: Config.logLevel
            })
        ]
    });
    return logger;
}