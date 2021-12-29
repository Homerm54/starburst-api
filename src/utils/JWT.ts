import jwt from 'jsonwebtoken';
import debug from 'debug';

const log = debug('jwt');

const key = process.env.JWT_SECRET_KET;
if (!key) throw Error('Missing JWT Secret Key in .env');

/**
 * Generetes a JWT.
 * By default, the signed token will have an expiration time of 2 hours.
 * @param uid The uid of the user in the database, used to perform operations based on it.
 * @returns The token, signed and ready to be send to the client
 */
export const generateJWT = (uid: string): Promise<string> => {
  log('Generating JWT...');

  return new Promise((resolve, reject) => {
    // Coerced to string using JSON.stringify
    jwt.sign({ uid }, key, { expiresIn: '2h' }, (err, token) => {
      if (err || !token) {
        if (!token) log('Sign function didn\'t generate any token');

        console.error(err);
        return reject('Error generating the JWT');
      }

      log('Token: %s', token);
      resolve(token);
    });
  })
}

/**
 * Decodes a JWT.
 * @param token The JWT signed by {@link generateJWT}
 * @returns {Promise<string>} The UID of the user in the database
 */
export const verifyJWT = (token: string) => {
  log('Verifying  JWT: %s', token);

  return new Promise((resolve, reject) => {
    jwt.verify(token, key, (err, payload) => {
      if (err || !payload) {
        log("Verify fucntion didn't generated any payload");

        console.error(err);
        return reject('Error decoding the JWT');
      }

      log('Payload: %o', payload);
      resolve(payload.uid);
    });
  });
};
