import { Request, Response, NextFunction } from 'express';
import { UserModel } from 'database/models/user';
import debug from 'debug';
import bcrypt from 'bcrypt';
import { devMode } from 'src/constants';
import { verifyJWT, generateJWT } from 'src/utils/JWT';

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
      message: devMode? 'Missing Authentication token' : 'Unauthorized request',
    });
  }

  try {
    const uid = await verifyJWT(token);

    if (uid) {
      req.body.uid = uid;
      next();
    }
  } catch (error) {
    console.error(error);
    if (error === 'Error decoding the JWT') {
      return res.status(401).json({
        error: true,
        code: 'unauthorized',
        message: devMode? 'Error verifying the token' : 'Unauthorized request',
      });
    }

    return res.status(500).json({ error: true, code: 'unknown-error' });
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
    const token = await generateJWT(newUser.id);
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
      message: devMode? 'Invalid Password' : 'Unauthorized request',
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
 * Check the password and email, if user found generate JWT.
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

  const token = await generateJWT(user.id);
  return res.json({ ok: true, token });
};


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
 * Usefull links: 
 * - https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/
 * - https://auth0.com/blog/complete-guide-to-nodejs-express-user-authentication/
 * - https://auth0.com/docs/authorization/flows#authorization-code-flow-with-proof-key-for-code-exchange-pkce-
 * 
 */
export const refreshAccessToken = () => {

};
