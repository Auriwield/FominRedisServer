const log4js = require('log4js');
log4js.configure({
    appenders:  {
        'out':  {type: 'stdout'},
        'file': {type: 'file', filename: 'logs/redis.log'}
    },
    categories: {
        default: { appenders: ['out', 'file'], level: 'debug'}
    }
});
const logger = log4js.getLogger("file");
module.exports = logger;