import express, { Request, Response, NextFunction } from 'express';
import {
  checkEmailInUse,
  createUser,
  deleteUser,
  refreshAccessToken,
  signIn,
  signOut,
  updateCredentials,
  isAuth,
  validateSecret,
  recoverPassword,
} from './controller';
import validator from 'validator';
import { ServerError } from 'lib/error';

/**
 * Middleware to check that the email passed in the params is truly an email
 */
const checkEmail = (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  if (email && validator.isEmail('' + email)) {
    next();
  } else {
    next(new ServerError(400, 'invalid-params', 'Invalid email passed'));
  }
};

/**
 * Router to connect all the authentication related services available by the API
 */
const authRouter = express.Router();

/**
 * Endpoint to create a new user, check if the email passed is not already in use
 * to ensure uniqueness in the database.
 */
authRouter.post('/', validateSecret, checkEmail, checkEmailInUse, createUser);

/**
 *
 */
authRouter.post('/update-credentials', isAuth, checkEmail, updateCredentials);

authRouter.post('/recover-password', recoverPassword);

/**
 * Status endpoint, currently doesn't check anything, just return ok
 * which means that the server is active and can recieve requests
 */
authRouter.delete('/', isAuth, deleteUser);

authRouter.post('/signin', checkEmail, signIn);
authRouter.post('/signout', isAuth, signOut);
authRouter.post('/refresh-access-token', refreshAccessToken);

export { authRouter };
