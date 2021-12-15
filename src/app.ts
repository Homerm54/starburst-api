import express, { Express } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { statusRouter } from './routes/status';

const app: Express = express();

/** Logging */
app.use(morgan('dev'));
/** Parse the request */
app.use(express.urlencoded({ extended: false }));
/** Takes care of JSON data */
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

// Status endpoints
app.use(statusRouter);

// IN DESIGN: AUTH ENDPOINTS

/** Error handling */
app.get('/', (req, res) => {
  res.send({ online: true, ok: true });
});

/** Server */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Web App Server ready on port: ${PORT}`))