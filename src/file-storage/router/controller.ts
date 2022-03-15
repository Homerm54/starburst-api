import { DatabaseErrorCodes } from 'database/error';
import { UserModel } from 'database/models/user';
import { NextFunction, Request, Response } from 'express';
import { account, files } from 'file-storage';
import { FileStorageErrorCodes } from 'file-storage/error';
import { ServerError } from 'lib/error';

/**
 * Get the user's metadata in the file storage service, currently yields:
 * - Max Space
 * - Space Left
 * - Space used by application
 * - Files inside application folder
 */
const getUserMetadata = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await account.getSpaceAnalitics(req.body.file_service_token);
    res.status(200).json(data);
  } catch (error) {
    console.log(error instanceof ServerError);
    next(error);
  }
};

/**
 * Finish the authentication flow started in the client, saving the resulting tokens,
 * both in the user's database, and returning the access token to the client.
 */
const finishAuthFlow = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { uid } = req.body;
  const user = await UserModel.findById(uid);

  if (!user) {
    next(
      new ServerError(404, DatabaseErrorCodes.USER_NOT_FOUND, 'User not found')
    );
  } else if (!req.body.code) {
    next(
      new ServerError(400, 'invalid-params', 'Missing code param in request')
    );
  } else {
    try {
      const data = await account.finishAuthFlow(req.body.code);
      user.fileStorageServiceAccountId = data.serviceAccountId;
      user.fileStorageRefreshToken = data.refresh_token;

      res.status(200).json({ access_token: data.access_token });
    } catch (error) {
      next(error);
    }

    await user.save();
  }
};

/**
 * Generates a new access token, based on the refresh token stored in the user doc
 * in the database.
 */
const generateRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { uid } = req.body;
  const user = await UserModel.findById(uid);

  if (!user) {
    next(new ServerError(404, 'user-not-found', 'User not found'));
  } else if (!user.fileStorageRefreshToken) {
    next(
      new ServerError(
        401,
        FileStorageErrorCodes.PENDING_AUTH_FLOW,
        "The user has not completed the authentication flow, and hence, there's missing data"
      )
    );
  } else {
    try {
      const token = await account.getNewAccessToken(
        user.fileStorageRefreshToken
      );
      res.status(200).json({ access_token: token });
    } catch (error) {
      next(error);
    }
  }
};

// Enpoints to upload files are for testing only, no futher refinement is done
const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  const { file } = req;
  const path = req.headers['file-storage-args'];
  console.log(req.headers);
  console.log(file, path);
  if (!file) {
    next(
      new ServerError(400, 'invalid-params', 'There is no file in the request')
    );
  } else {
    await files.upload(
      req.params.accessToken,
      file.buffer,
      `${path || ''}/${file.originalname}`,
      true
    );
    res.send(true);
  }
};

const downloadFile = async (req: Request, res: Response) => {
  const [file, metadata] = await files.get.file(
    req.body.file_service_token,
    `${req.body.path}`
  );

  res.setHeader('Content-Type', metadata.mimetype);
  res.setHeader('Content-Length', metadata.size);
  res.send(file);
};

const deleteItem = async (req: Request, res: Response, next: NextFunction) => {
  const path = req.headers['file-storage-args'];
  if (!path || typeof path !== 'string') {
    return next('error');
  }

  const file = await files.delete(req.body.file_service_token, path);
  res.send(file);
};

const getFolder = async (req: Request, res: Response, next: NextFunction) => {
  const path = req.headers['file-storage-args'];
  console.log(path);
  if (typeof path !== 'string') {
    return next('error');
  }

  const folderData = await files.get.folder(req.body.file_service_token, path);
  console.log(folderData);

  return res.json(folderData);
};

export {
  getUserMetadata,
  generateRefreshToken,
  finishAuthFlow,
  uploadFile,
  downloadFile,
  deleteItem,
  getFolder,
};
