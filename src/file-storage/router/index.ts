import {
  deleteItem,
  downloadFile,
  finishAuthFlow,
  generateRefreshToken,
  getFolder,
  getUserMetadata,
  uploadFile,
} from 'file-storage/router/controller';
import express, { NextFunction, Request, Response } from 'express';
import { isAuth } from 'auth/controller';
import multer from 'multer';
import { ServerError } from 'lib/error';
import { FileStorageErrorCodes } from 'file-storage/error';

const storage = multer.memoryStorage();
const fileMiddleware = multer({ storage }).single('File');

/** Checks that the required tokens are present */
const isFileServiceAuth = (req: Request, res: Response, next: NextFunction) => {
  const tokenError = new ServerError(
    400,
    FileStorageErrorCodes.MISSING_ACCESS_TOKEN,
    'The expected access token to interact with the API is not present in the headers'
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

router.get('/file', isAuth, isFileServiceAuth, downloadFile);
router.delete('/item', isAuth, isFileServiceAuth, deleteItem);
router.post(
  '/upload',
  isAuth,
  isFileServiceAuth,
  (req, res, next) => {
    req.params.accessToken = req.body.file_service_token;
    next();
  },
  fileMiddleware,
  uploadFile
);

router.get('/folder', isAuth, isFileServiceAuth, getFolder);

export { router as fileServiceRouter, isFileServiceAuth };
