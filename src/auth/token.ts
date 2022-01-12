import jwt from 'jsonwebtoken';
import debug from 'debug';
import { variables } from 'lib/config';
import { tokenConfig } from './config';

const log = debug('tokens');

const { TokenExpiredError, JsonWebTokenError } = jwt;

enum ErrorCodes {
  bad = 'bad-token',
  expired = 'expired-token',
  unknown = 'unknown',
}

export class TokenError extends Error {
  code: ErrorCodes;

  constructor(codeArg: ErrorCodes) {
    super(codeArg);

    this.code = codeArg;
  }
}

/**
 * Generetes an Access Token, that expires in 15 minutes.
 * @param {string} uid The uid of the user in the database, used as token payload.
 * @returns {string} The token, signed and ready to be send to the client.
 */
export const generateAccessToken = (uid: string): Promise<string> => {
  log('Generating access token...');

  return new Promise((resolve, reject) => {
    // Coerced to string using JSON.stringify
    jwt.sign({ uid }, variables.JWT_SECRET_KEY, { expiresIn: tokenConfig.accessTokenExpireTime }, (err, token) => {
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
 * Decodes an Access Token.
 * @param token The Access Tken signed by {@link generateAccessToken}
 * @returns {Promise<string>} The UID of the user in the database
 */
export const verifyAccessToken = (token: string) => {
  log('Verifying  JWT: %s', token);

  return new Promise((resolve, reject) => {
    jwt.verify(token, variables.JWT_SECRET_KEY, (err, payload) => {
      if (err || !payload) {
        if (err instanceof TokenExpiredError) {
          log("Expired Token error %o", err);
          reject(new TokenError(ErrorCodes.expired));
        } else if (err instanceof JsonWebTokenError) {
          log("Token error %o", err);
          reject(new TokenError(ErrorCodes.bad));
        } else {
          log('Unkwon error');
          reject(new TokenError(ErrorCodes.unknown));
        }
      } else {
        log('Payload: %o', payload);
        resolve(payload.uid);
      }
    });
  });
};
