import express from 'express';
import { checkEmailInUse, createUser, deleteUser, signIn, updateUser, validateJWT } from 'controllers/auth.controller';

const authRouter = express.Router();

/**
 * Endpoint to create a new user, check if the email passed is not already in use
 * to ensure uniqueness in the database.
 */
authRouter.post('/create', checkEmailInUse, createUser);

// TODO: update route
authRouter.post('/update', validateJWT, updateUser);

/**
 * Status endpoint, currently doesn't check anything, just return ok
 * which means that the server is active and can recieve requests
 */
authRouter.delete('/delete', validateJWT, deleteUser);

authRouter.post('/signin', /* Email and password validation */ signIn);

export { authRouter };
