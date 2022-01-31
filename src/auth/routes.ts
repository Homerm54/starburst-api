import express from 'express';
import { invalidHTTP } from 'middlewares/errors';
import {
  checkEmailInUse,
  createUser,
  deleteUser,
  refreshAccessToken,
  signIn,
  signOut,
  updateCredentials,
  isAuth,
} from './controller';

/**
 * Router to connect all the authentication related services available by the API
 */
const authRouter = express.Router();

/**
 * Endpoint to create a new user, check if the email passed is not already in use
 * to ensure uniqueness in the database.
 */
authRouter.post('/', checkEmailInUse, createUser);

/**
 *
 */
authRouter.post('/update-credentials', isAuth, updateCredentials);

/**
 * Status endpoint, currently doesn't check anything, just return ok
 * which means that the server is active and can recieve requests
 */
authRouter.delete('/', isAuth, deleteUser);

authRouter.post('/signin', /* Email and password validation */ signIn);
authRouter.post('/signout', isAuth, signOut);
authRouter.post('/refresh-access-token', refreshAccessToken);

authRouter.use(invalidHTTP);

export { authRouter };
