import mongoose from 'mongoose';
import debug from 'debug';

const logger = debug('db'); 

interface IDB {
  /** Instance of mongoose's connection with the database for raw operations */
  instance: null | mongoose.Connection;
  /** Whether the instance is currently connected to Mongo and able to process requests */
  connected: boolean;

  // Methods
  /** 
   * Init the MongoDB connection.
   * This method creates a single connection with mongo, multi-mongo is not supported.
   * This is the first method that should be called as soon as possible in the application
   * to init DB connection.
   * 
   * This set a global default connection for moongose, thus, models are scoped to a 
   * single connection.
   * See https://mongoosejs.com/docs/connections.html#multiple_connections for more.
   * */
  init: () => Promise<void>;

  /**
   * 
   */
  close: () => Promise<void>;
}

// Constants and validator out of scope, if not in .env vars, crash right away
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
if (!dbUser || !dbPassword) throw Error('Missing DB username and/or password');
const uri = `mongodb+srv://${dbUser}:${dbPassword}@cluster0.nt8vz.mongodb.net/personal-app?retryWrites=true&w=majority`;

/**
 * Unique DB connection object with methods and variables to easy access across the project.
 * @todo Migth add support for some sort of event emitter to let endpoints know that should
 * not handle more calls until connection restablished
 */
const db : IDB = {
  instance: null,
  connected: false,
  async init() {
    logger('DB init method called, establishing connection...');
    const db = await mongoose.connect(uri);
    this.instance = db.connection;
    this.connected = true;
    logger('Connected successfully!');

    // -------------------------------------
    // Listeners
    this.instance.on('error', (error) => {
      // Errors doesn't necessarily means a lost in connection, parsing
      // and max doc sizes throws errors here, hence, connected isn't updated

      // debug here
      console.error(error);
    });

    this.instance.on('disconnected', (event) => {
      console.log('Server disconnected from DB');
      this.connected = false;
    });

    // fired when server reconnects after lossing connection with the DB.
    this.instance.on('reconnected', () => {
      console.log('Server connection restablished from DB');
      this.connected = true;
    });
  },

  async close() {
    if (!this.instance) throw Error('Must init connection before closing it.');

    logger('Closing DB connection');
    await this.instance.close(); // This will fired disconnected event that sets variable
  }
}

/**
 * Nodejs caches the mongoose import, so that this imported object
 * will be the same in other imported objects in other files.
 * 
 * Hence, this db connection will persist across files in the project.
 */
export { db };
