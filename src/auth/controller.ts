/**
 * @module Authentication
 * @author Omer Marquez <omer.marquezt@gmail.com>
 * @file Middlewares and Endpoints related to the authentication and authorization service inside
 * the API.
 * This file, along with the middlewares and endpoints are the only source of code from where all the
 * authentication service dwells. Hence, here is defined how the Auth Service work, caveats and general rules.
 *
 * @see README.md For more information on how this workds
 */

import { Request, Response, NextFunction } from 'express';
import { UserModel } from 'database/models/user';
import debug from 'debug';
import { verifyAccessToken, generateAccessToken } from 'auth/token';
import { AuthorizartionErrorCodes, TokenError } from 'auth/error';
import { variables } from 'lib/config';
import { ServerError } from 'lib/error';
import { RefreshToken } from 'database/models/tokens';
import { DatabaseErrorCodes } from 'database/error';
import { sendEmail } from 'mail';
import { generatePasswordRecoveryEmail } from './utils';

const { devMode } = variables;

const log = debug('auth:controller');

// --------------------- MIDDLEWARES
/**
 * Validates that the request made contains the secret key expected in the body,
 * this secret key is intended to be used to limit the creation of new users.
 */
export const validateSecret = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const secret = req.body.secret_signup_code;

  if (!secret || secret !== variables.SECRET_SIGNUP_KEY) {
    next(new ServerError(403, 'forbidden', 'Unable to process request'));
  } else {
    next();
  }
};

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
export const isAuth = async (
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
        AuthorizartionErrorCodes.UNAUTHORIZED,
        devMode ? 'Missing Authentication token' : 'Unauthorized Request'
      )
    );
    return;
  }

  try {
    const uid = await verifyAccessToken(token);
    req.body.uid = uid;
    next();
  } catch (error) {
    if (error instanceof TokenError) {
      if (error.code === 'expired-token') {
        next(
          new ServerError(
            401,
            AuthorizartionErrorCodes.EXPIRED_TOKEN,
            'Unauthorized Request'
          )
        );
      } else {
        next(
          new ServerError(
            401,
            AuthorizartionErrorCodes.INVALID_ACCESS_TOKEN,
            'Unauthorized Request'
          )
        );
      }
    } else {
      console.error(error);
      next(new ServerError(401, 'unknown-error', 'Unauthorized Request'));
    }
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

  try {
    const user = await UserModel.findOne({ _id: uid }).orFail();
    if (user.isAdmin) {
      next();
    } else {
      next(
        new ServerError(403, AuthorizartionErrorCodes.FORBIDDEN, 'forbidden')
      );
    }
  } catch (error) {
    next(
      new ServerError(
        404,
        AuthorizartionErrorCodes.USER_NOT_FOUND,
        'User not found'
      )
    );
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
    next(
      new ServerError(
        400,
        'invalid-params',
        'Invalid Password, length type is incorrect'
      )
    );
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
    next(
      new ServerError(
        500,
        'unknown-error',
        'An unexpected error ocurred, check logs for details'
      )
    );
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
    next(
      new ServerError(400, DatabaseErrorCodes.USER_NOT_FOUND, 'User not found')
    );
    return;
  }

  const match = await user.isValidPassword(password);
  if (!match) {
    next(
      new ServerError(
        401,
        AuthorizartionErrorCodes.INVALID_CREDENTIALS,
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
    next(
      new ServerError(
        500,
        'unknown-error',
        'An unexpected error ocurred, check logs for details'
      )
    );
  }
};

/**
 * Allow to update authentication credentials.
 */
export const updateCredentials = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, uid, password } = req.body;

  if (!password) {
    return next(
      new ServerError(401, 'invalid-params', 'Must send credentials')
    );
  }

  const user = await UserModel.findOne({ _id: uid });
  if (!user) {
    return next(
      new ServerError(
        401,
        AuthorizartionErrorCodes.INVALID_ACCESS_TOKEN,
        'Endpoint called with an invalid access token'
      )
    );
  }

  if (!user.isValidPassword(password)) {
    return next(
      new ServerError(
        401,
        AuthorizartionErrorCodes.INVALID_CREDENTIALS,
        'Unable to authenticate'
      )
    );
  }

  if (email) {
    user.email = email;
    await user.save();
    return res.json({
      ok: true,
      action: 'email-update',
    });
  }

  return next(
    new ServerError(
      400,
      'invalid-params',
      'Endpoint called with invalid params'
    )
  );
};

export const recoverPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, code, password } = req.body;

  if (!email || !(code && password)) {
    return next(
      new ServerError(
        400,
        'invalid-params',
        'Endpoint called with invalid params'
      )
    );
  }

  if (!code) {
    // No recovery code present or request, this means that the action is to send
    // a email with the recovery link
    const user = await UserModel.findOne({ email });
    if (!user) {
      return next(
        new ServerError(
          400,
          'invalid-params',
          'Missing or invalid email address'
        )
      );
    }

    try {
      const code = await user.generateRecoveryCode();
      await sendEmail({
        to: email,
        subject: 'Password recovery email',
        htmlBody: generatePasswordRecoveryEmail({ code, email }),
      });

      return res.status(200).json({ ok: true, action: 'email-sent' });
    } catch (error) {
      console.error(error);
      return next(
        new ServerError(
          400,
          AuthorizartionErrorCodes.UNABLE_TO_SEND_EMAIL,
          'Unable to send the email, either the service is unavailable of email is bad'
        )
      );
    }
  } else {
    const user = await UserModel.findOne({ recoveryCode: code });
    if (!user) {
      return next(
        new ServerError(
          400,
          AuthorizartionErrorCodes.INVALID_RECOVERY_CODE,
          "The code used is invalid, either was already used, or doesn't exist in database"
        )
      );
    }

    if (password.length < 6 || password.length > 12) {
      return next(
        new ServerError(400, 'invalid-params', 'Password length invalid')
      );
    }

    user.password = password;
    user.recoveryCode = null;
    await user.save();

    return res.status(200).json({
      ok: true,
      action: 'password-updated',
    });
  }
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
  try {
    const user = await UserModel.findOne({ email }).orFail();
    const match = await user.isValidPassword(password);

    if (!match) {
      next(
        new ServerError(
          401,
          AuthorizartionErrorCodes.INVALID_CREDENTIALS,
          'Unable to authenticate'
        )
      );
      return;
    }

    const accessToken = await generateAccessToken(user.id);
    const refreshToken = await RefreshToken.createToken(user);

    res.json({
      ok: true,
      accessToken,
      refreshToken,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    // if signed in, this means that the recoveryCode is no longer needed
    // delete it from the database **after** response send
    user.recoveryCode = null;
    await user.save();
  } catch (error) {
    next(
      new ServerError(400, DatabaseErrorCodes.USER_NOT_FOUND, 'User not found')
    );
  }
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
          AuthorizartionErrorCodes.INVALID_REFRESH_TOKEN,
          'Invalid Token, please reauthenticate to generate a new token pair'
        )
      );
      return;
    }

    const expired = await RefreshToken.verifyExpiration(token);

    if (!expired) {
      const user = await UserModel.findOne({ _id: token.user });
      if (!user) {
        next(
          new ServerError(
            401,
            AuthorizartionErrorCodes.INVALID_REFRESH_TOKEN,
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
          AuthorizartionErrorCodes.EXPIRED_TOKEN,
          'The refresh token has expired, please authenticate again'
        )
      );
    }
  } catch (error) {
    next(error);
  }
};
