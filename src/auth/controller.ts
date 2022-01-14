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
import { verifyAccessToken, generateAccessToken, TokenError } from 'auth/token';
import { variables } from 'lib/config';
import { ServerError } from 'middlewares/errors';
import { RefreshToken } from 'database/models/tokens';

const { devMode } = variables;

const log = debug('auth:controller');

// --------------------- Middlewares
/**
 * Checks whether the email passed on the body is already in use the database.
 */
export const checkEmailInUse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;

  const one = await UserModel.findOne({ email });
  if (one) {
    next(new ServerError(400, 'email-in-use', 'Email already in use'));
    return;
  }

  next();
};

/**
 * Validates the JWT in the request, and allow next middleware in the chain, storing the
 * user id inside `req.body.uid`.
 */
export const validateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token =
    authHeader && typeof authHeader === 'string' && authHeader.split(' ')[1]; // Split the Bearer <token>

  if (!token) {
    next(
      new ServerError(
        403,
        'unauthorized',
        devMode ? 'Missing Authentication token' : 'Unauthorized Request'
      )
    );
    return;
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

    next(new ServerError(401, code, 'Unauthorized Request'));
  }
};

/**
 * Authorization wall to block non-admin users requests.
 */
export const validateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { uid } = req.body;

  if (!uid) {
    next(new ServerError(400, 'missing-uid', 'Missing UID'));
    return;
  }
  const user = await UserModel.findOne();

  if (!user) {
    next(new ServerError(404, 'user-not-found', 'User not found'));
    return;
  }

  if (user.isAdmin) {
    next();
  } else {
    next(new ServerError(403, 'forbidden', 'forbidden'));
  }
};

// --------------------- ROUTES
/**
 * Creates a new user, with the given data, inserting it into the database.
 * If successfull, generates a JWT logging the user in.
 */
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Create user with the value passed via req
  const { email, password } = req.body;

  log(
    `Checking new user with email: ${email} and uncrypted password: ${password}`
  );

  if (password.length < 6 || password.length > 12) {
    const code = 'invalid-password';
    const message = 'Invalid Password, length type is incorrect';
    next(new ServerError(400, code, message));
    return;
  }

  try {
    const newUser = new UserModel({ email, password });
    await newUser.save();

    // Generate a token to allow client's subsequent calls to endpoint authenticated
    const accessToken = await generateAccessToken(newUser.id);
    const refreshToken = await RefreshToken.createToken(newUser);
    res.status(200).json({
      ok: true,
      accessToken,
      refreshToken,
      isAdmin: newUser.isAdmin,
      username: newUser.username,
    });
  } catch (error) {
    console.error(error);
    next(new ServerError(500, 'unknown-error'));
  }
};

/**
 * Deletes a user from the database, as long as the uid and password matches any record.
 * uid is required form the req.body, so it must be there, better getting it from the
 * JWTValidator.
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Delete the user with the given password, also a protected route.
  const { uid, password } = req.body;
  log(`Deleting user: ${uid}`);

  const user = await UserModel.findOne({ _id: uid });
  if (!user) {
    next(new ServerError(400, 'user-not-found', 'User not found'));
    return;
  }

  const match = await user.isValidPassword(password);
  if (!match) {
    next(
      new ServerError(
        401,
        'unauthorized',
        devMode ? 'Invalid Password' : 'Unauthorized Request'
      )
    );
    return;
  }

  try {
    await RefreshToken.findOneAndDelete({ user: user.id });
    await user.delete();
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    next(new ServerError(500, 'unknow-error'));
  }
};

/**
 * TODO: Bad, raw, replace by update email and/or password
 */
export const updateCredentials = async (req: Request, res: Response) => {
  return res.json({ ok: true });
};

/**
 * Authenticate the User agains the Autentication System.
 * Generates an brand new access token and refresh token.
 */
export const signIn = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;
  const user = await UserModel.findOne({ email });

  if (!user) {
    next(new ServerError(400, 'user-not-found', 'User not found'));
    return;
  }

  const match = await user.isValidPassword(password);
  if (!match) {
    next(new ServerError(401, 'auth-failed', 'Unable to authenticate'));
    return;
  }

  const accessToken = await generateAccessToken(user.id);
  const refreshToken = await RefreshToken.createToken(user);
  return res.json({
    ok: true,
    accessToken,
    refreshToken,
    username: user.username,
    isAdmin: user.isAdmin,
  });
};

/**
 * Remove the refresh token of the user from db to make it unusable anymore.
 * This one, any attempt to reuse the token will fail, hence, the user needs to reauthenticate.
 */
export const signOut = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { uid } = req.body;
    if (!uid) {
      next(new ServerError(400, 'invalid-params', 'uid param is missing'));
      return;
    }

    const refreshToken = await RefreshToken.findOne({ user: uid });
    if (refreshToken) {
      refreshToken.token = null;
      await refreshToken.save();
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new Access Token, along with a new Refresh Token, thus, generating a new token pair.
 * In case that the token has expired, or is reused, the user must sign in again to get a new pair.
 *
 */
export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    next(new ServerError(400, 'invalid-params', 'Invalid Params passed'));
    return;
  }

  try {
    const token = await RefreshToken.findOne({ token: refreshToken });
    if (!token) {
      next(
        new ServerError(
          401,
          'unauthorized',
          'Invalid Token, please reauthenticate to generate a new token pair'
        )
      );
      return;
    }

    const isValid = await RefreshToken.verifyExpiration(token);

    if (isValid) {
      const user = await UserModel.findOne({ _id: token.user });
      if (!user) {
        next(
          new ServerError(
            401,
            'unauthorized',
            'Invalid Token, please reauthenticate to generate a new token pair'
          )
        );
        return;
      }

      const refreshToken = await RefreshToken.createToken(user);
      const accessToken = await generateAccessToken(user.id);

      res.status(200).json({
        accessToken,
        refreshToken,
        ok: true,
      });
    } else {
      next(
        new ServerError(
          403,
          'expired-token',
          'The refresh token has expired, please authenticate again'
        )
      );
      return;
    }
  } catch (error) {
    next(error);
  }
};
