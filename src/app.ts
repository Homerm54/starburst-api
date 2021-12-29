import express, { Express } from 'express';
import cors from 'cors';
import { db } from 'database';
import helmet from 'helmet';

import { statusRouter } from 'routes/status';
import { authRouter } from 'routes/auth';

import { httpLogger } from 'middleware/logger';

const app: Express = express();

// ---------------- MIDDLEWARES ------------------------
app.use(helmet());
app.use(httpLogger);
// parse application/json body type, the only one supported by this API
app.use(express.json());

const whiteList = ['http://localhost:3000', 'https://personal-organizer-app.herokuapp.com'];
const corsOptions : cors.CorsOptions  = {
  origin: function (origin, callback) {
    if (!origin || whiteList.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

/** Allow Cross Site request from */
app.use(cors(corsOptions));


// ---------------- ROUTES ------------------------
// SERVER STATUS ENDPOINT 
app.use(statusRouter);

// AUTH ENDPOINTS
app.use('/auth', authRouter);


// ---------------- SERVER INIT ------------------------
// first connect to database, then start listen to request on PORT
db.init()
  .then(() => {
    /** Server */
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`REST API ready on port: ${PORT}`));
  })
  .catch((error) => {
    console.error(error);
    console.error('REST API crashed on init, manual restart is needed');
  });
