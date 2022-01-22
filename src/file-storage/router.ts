import {
  finishAuthFlow,
  generateRefreshToken,
  getUserMetadata,
} from 'file-storage/controller';
import express, { NextFunction, Request, Response } from 'express';
import { ServerError } from 'middlewares/errors';
import { isAuth } from 'auth/controller';

/** Checks that the required tokens are present */
const isFileServiceAuth = (req: Request, res: Response, next: NextFunction) => {
  const tokenError = new ServerError(
    400,
    'missing-service-token',
    'The service token used to authenticate wiht dropbox is missing from the headers'
  );
  const serviceToken = req.headers['file-service-authorization'];
  const trueToken =
    serviceToken &&
    typeof serviceToken === 'string' &&
    serviceToken.split(' ')[1];

  if (!trueToken) {
    next(tokenError);
  } else {
    req.body.file_service_token = trueToken;
    next();
  }
};

/**
 * Router to allow authentication and basic service requests that aren't related to any service in
 * particular, but rather are really about the core of the file storage service.
 */
const router = express.Router();

// Auth section
router.post('/refresh-service-token', isAuth, generateRefreshToken);
router.post('/finish-auth-flow', isAuth, finishAuthFlow);

// Account section
router.get('/account-data', isAuth, isFileServiceAuth, getUserMetadata);

// Files CRUD Section

export { router as fileServiceRouter, isFileServiceAuth };
