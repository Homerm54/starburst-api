import express, { Express } from 'express';
import morgan from 'morgan';
import cors from 'cors';

const app: Express = express();

/** Logging */
app.use(morgan('dev'));
/** Parse the request */
app.use(express.urlencoded({ extended: false }));
/** Takes care of JSON data */
app.use(express.json());

const whiteList = ['http://localhost:3000/', 'https://personal-organizer-app.herokuapp.com/'];
const corsOptions : cors.CorsOptions  = {
  origin: function (origin, callback) {
    console.log(origin);
    if (!origin || whiteList.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

/** Allow Cross Site request from */
app.use(cors(corsOptions));

/** Error handling */
app.get('/', (req, res) => {
  res.send('Hello World!')
});

/** Server */
const PORT: any = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`)
})