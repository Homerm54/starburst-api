import express, { Express } from 'express';
import cors from 'cors';
import { db } from 'database';
import helmet from 'helmet';
import { statusRouter } from 'routes/status';
import { authRouter } from 'auth/routes';
import { httpLogger } from 'middlewares/logger';
import { variables } from 'lib/config';
import { notFound, errorHandler } from 'middlewares/errors';
import { sendAPIDocumentationFile } from 'routes/docs';
import { fileServiceRouter } from 'file-storage/router';
import { parser } from 'middlewares/parser';
import { checkMailServiceStatus } from 'mail';

const app: Express = express();

// ---------------- MIDDLEWARES ------------------------
app.use(helmet());
app.use(httpLogger);
// parse application/json body type, the only one supported by this API
app.use(parser);

const whiteList = [
  `http://localhost:${variables.CLIENT_PORT}`,
  'https://starburst-app.herokuapp.com',
];
const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    if (!origin || whiteList.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

/** Allow Cross Site request from */
app.use(cors(corsOptions));

// ---------------- Simple Routes
app.use(statusRouter);
app.get('/api-docs', sendAPIDocumentationFile);

// ---------------- Services
// AUTH ENDPOINTS
app.use('/auth', authRouter);
app.use('/file-service', fileServiceRouter);

// ---------------- Modules

// Last handlers
app.use(notFound);
app.use(errorHandler);

// ---------------- SERVER INIT ------------------------
// first connect to database, then start listen to request on PORT
db.init()
  // DB Service Started, check Mail Service status
  .then(checkMailServiceStatus)
  .then(() => {
    /** Server start */
    app.listen(variables.PORT, () =>
      console.log(`REST API ready on port: ${variables.PORT}`)
    );
  })
  .catch((error) => {
    console.error(error);
    console.error('REST API crashed on init, manual restart is needed');
  });
