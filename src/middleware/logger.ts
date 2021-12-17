import morgan from 'morgan';
import { devMode } from '../constants';

const httpLogger = morgan(devMode ? 'dev' : 'common');

// File where morgan can dump logs on, leaved here just in case, but not
// currently in use
// const logFileStream = fs.createWriteStream('./access.log', { flags: 'a' });
// const fileLogger = morgan("common", { stream: logFileStream });

export { httpLogger };
