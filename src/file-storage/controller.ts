import { UserModel } from 'database/models/user';
import { NextFunction, Request, Response } from 'express';
import { account, FileServiceError } from 'file-storage';
import { ServerError } from 'middlewares/errors';

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
    next(new ServerError(404, 'user-not-found', 'User not found'));
  } else if (!req.body.code) {
    next(
      new ServerError(400, 'missing-param', 'Missing code param in request')
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
        'not-authenticated',
        "User hasn't completed the File Service Authentication Flow"
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

export { getUserMetadata, generateRefreshToken, finishAuthFlow };
