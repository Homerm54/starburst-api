import jwt from 'jsonwebtoken';
import debug from 'debug';
import { variables } from 'lib/config';
import { tokenConfig } from './config';
import { TokenError } from './error';

const log = debug('tokens');
const { TokenExpiredError, JsonWebTokenError } = jwt;

type Token = {
  // The ID of the user in the Database, UserID, UID
  uid: string;
};

/**
 * Generetes an Access Token, that expires in 15 minutes.
 * @param {string} uid The uid of the user in the database, used as token payload.
 * @returns {string} The token, signed and ready to be send to the client.
 */
export const generateAccessToken = (uid: string): Promise<Token> => {
  log('Generating access token...');

  return new Promise((resolve, reject) => {
    // Coerced to string using JSON.stringify
    jwt.sign(
      { uid },
      variables.JWT_SECRET_KEY,
      { expiresIn: tokenConfig.accessTokenExpireTime },
      (err, token) => {
        if (err || !token) {
          if (!token) log("Sign function didn't generate any token");

          console.error(err);
          return reject('Error generating the JWT');
        }

        log('Token: %s', token);
        resolve(token);
      }
    );
  });
};

/**
 * Decodes an Access Token.
 * @param token The Access Tken signed by {@link generateAccessToken}
 * @returns {Promise<string>} The UID of the user in the database
 */
export const verifyAccessToken = (token: string): Promise<Token> => {
  log('Verifying  JWT: %s', token);

  return new Promise((resolve, reject) => {
    jwt.verify(token, variables.JWT_SECRET_KEY, (err, payload) => {
      if (err || !payload) {
        if (err instanceof TokenExpiredError) {
          log('Expired Token error %o', err);
          reject(new TokenError('expired-token'));
        } else if (err instanceof JsonWebTokenError || !payload) {
          log('Token error %o', err);
          reject(new TokenError('bad-token'));
        } else {
          log('Unkwon error');
          reject(new TokenError('unknown-token-error'));
        }
      } else {
        log('Payload: %o', payload);
        resolve(payload.uid);
      }
    });
  });
};
