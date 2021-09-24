import express, { Express } from 'express';
import morgan from 'morgan';

const app: Express = express();

/** Logging */
app.use(morgan('dev'));
/** Parse the request */
app.use(express.urlencoded({ extended: false }));
/** Takes care of JSON data */
app.use(express.json());


/** Error handling */
app.get('/', (req, res) => {
  res.send('Hello World!')
})

/** Server */
const PORT: any = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`)
})