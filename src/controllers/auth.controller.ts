/**
 * @module Authentication
 * @file Middlewares and Endpoints related to the authentication and authorization service inside the API.
 * @author Omer Marquez <omer.marquezt@gmail.com>
 * 
 * This file, along with the middlewares and endpoints are the single source of coode from where all the
 * authentication service live. Hence, here is defined how the Auth Service work, caveats and general rules.
 * 
 * ## Tokens
 * 
 * The auth service is token drived, which means that request to secured routes are checked with the
 * **authorization** token in the header of the request. Two types of tokens are used, **Access Token**
 * and **Refresh Tokens**.
 * 
 * ### Access Tokens
 * This tokens are short live (less that an hour), and are the one that carries the information needed to
 * see who is requesting, access level, and other details needed to process the request. Anyone who holds
 * this token can interact with the API and it's routes, hence, it's important to keep then safetly store.
 * 
 * Because of the power of this tokens they are short lived, if an evil user intercepts the token, there's
 * only a short frame for what the user can do.
 * 
 * ### Refresh Tokens
 * Once an Access Token expires, a new one must be generated to keep interacting with the API. To avoid having
 * to reauthenticate every 15 minutes or so, a Refresh token is also issued along with the Access Token when
 * authenticated, using this token, a new Access Token can be generated without the need to send credentials
 * again to the server.
 * 
 * The refresh token has a lifespam of up to 1 month, this way, a user can be singed client side up to 1 month,
 * without requiring to sign in again (authenticate again).
 * 
 * ### Rotatory Refresh Token System
 * Because of the power of generating infinite access tokens, a **Rotatory Refresh Token System** is implemented,
 * this way, the absolute lifespam of the token pair is reduced, an in case an evil user intercepts any of the
 * tokens, the system can identify when a refresh token is reused, and log the user out of the system for security.
 * 
 * This method lets the user by forever authenticated, as long as no token re-use is detected by the auth system or
 * no refesh token is expired due to **max inactive time**.
 * 
 * The system will work storing the tokens in the database, keeping a "token history" for every user. How many
 * tokens are stored determines for how long the system is able to detect a reutilization of tokens.
 * 
 * ## Sign Out
 * The sign out process just invalidates any active token, needing to sign in again on every device.
 * 
 * @see folder: designs/auth for diagrams on the process
 */

import { Request, Response, NextFunction } from 'express';
import { UserModel } from 'database/models/user';
import debug from 'debug';
import { verifyAccessToken, generateAccessToken, TokenError } from 'src/lib/auth-tokens';
import { variables } from 'src/lib/config';

const { devMode } = variables;

const log = debug('auth:controller');

// --------------------- Middlewares
/**
 * Checks whether the email passed on the body is already in use the database.
 */
export const checkEmailInUse = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  const one = await UserModel.findOne({ email });
  if (one) return res.status(400).json({ error: true, message: 'Email already in use', code: 'email-in-use' });

  next();
}

/**
 * Validates the JWT in the request, and allow next middleware in the chain, storing the
 * user id inside `req.body.uid`.
 */
export const validateJWT = async (req: Request, res: Response, next: NextFunction) => {
  console.log(req.headers)
  const authHeader = req.headers['authorization'];
  const token = authHeader && typeof authHeader === 'string' && authHeader.split(' ')[1]; // Split the Bearer <token>

  if (!token) {
    return res.status(403).json({
      error: true,
      code: 'unauthorized',
      message: devMode? 'Missing Authentication token' : 'Unauthorized Request',
    });
  }

  try {
    const uid = await verifyAccessToken(token);
    if (uid) {
      req.body.uid = uid;
      next();
    }
  } catch (error) {
    let code = 'unknow';
    if (error instanceof TokenError) code = error.code;

    return res.status(401).json({
      code,
      error: true,
      message: 'Unauthorized Request',
    });
  }
}

// --------------------- ROUTES
/**
 * Creates a new user, with the given data, inserting it into the database.
 * If successfull, generates a JWT logging the user in.
 */
export const createUser = async (req: Request, res: Response) => {
  // Create user with the value passed via req
  const { email, password } = req.body;

  log(`Checking new user with email: ${email} and uncrypted password: ${password}`);

  if (password.length < 6 || password.length > 12) {
    const code = 'invalid-password';
    let message = 'Invalid Password, length type is incorrect';

    return res.status(400).json({ error: true, code, message });
  }

  try {
    const newUser = new UserModel({ email, password });
    await newUser.save();

    // Generate a token to allow client's subsequent calls to endpoint authenticated
    const token = await generateAccessToken(newUser.id);
    return res.status(200).json({ ok: true, token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: true, code: 'unknown-error' });
  }
};

/**
 * Deletes a user from the database, as long as the uid and password matches any record.
 * uid is required form the req.body, so it must be there, better getting it from the
 * JWTValidator.
 */
export const deleteUser = async (req: Request, res: Response) => {
  // Delete the user with the given password, also a protected route.
  const { uid, password } = req.body;
  log(`Deletiing user: ${uid}`);

  const user = await UserModel.findOne({ _id: uid });
  if (!user) {
    return res.status(400).json({
      error: true,
      message: 'User not found',
      code: 'user-not-found',
    });
  }

  const match = await user.isValidPassword(password);
  if (!match) {
    return res.status(400).json({
      error: true,
      code: 'unauthorized',
      message: devMode? 'Invalid Password' : 'Unauthorized Request',
    });
  }

  try {
    await user.delete();
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: true, code: 'unknown-error' });
  }
};

/**
 * TODO: Do this
 */
export const updateUser = async (req: Request, res: Response) => {
  return res.json({ ok: true });
}

/**
 * Check the password and email and generate a JWT with new refresh token.
 */
export const signIn = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await UserModel.findOne({ email });

  if (!user) {
    return res.status(400).json({
      error: true,
      message: 'User not found',
      code: 'user-not-found',
    });
  }

  const match = await user.isValidPassword(password);
  if (!match) {
    return res.status(400).json({
      error: true,
      message: 'Unable to authenticate',
      code: 'auth-failed',
    });
  }

  const token = await generateAccessToken(user.id);
  return res.json({ ok: true, token });
};

/**
 * TODO: 
 * Delete the refresh token of the user from db to make it unusable anymore
 */
export const signOut = async (req: Request, res: Response) => {
  // Delete refresh token

}


/**
 * TODO: refresh the short lived access token of an user with this.
 * 
 * With the implementation of refresh token rotation + access tokens,
 * they can actually live in the localstorage, since compromising it won't affect
 * at all.
 * 
 * Also, implement a "Token Family" history to keep track of old
 * refresh tokens used, and log the user out.
 * 
 * Useful links: 
 * - https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/ -> Introduction, worth rereading before doing the diagrams
 * - https://hasura.io/blog/best-practices-of-using-jwt-with-graphql/ -> A little bit of everything
 * - https://auth0.com/docs/security/tokens/refresh-tokens/refresh-token-rotation -> Read this a little bit
 * - https://www.bezkoder.com/jwt-refresh-token-node-js-mongodb/ -> refresh token schema guide without rotation
 * 
 */
export const refreshAccessToken = () => {

};
