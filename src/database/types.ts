/**
 * @file Typescript, all the types, interfaces, and classes definitions that might
 * be needed on a global scope are here, to easy the imports.
 */

import { Document, Schema } from 'mongoose';

export interface ITimestamps {
  /** Date when the docuemnt was created and saved in the Database */
  createdAt: Date;

  /** Last time the document was modified and saved, using the .save method */
  updatedAt: Date;
}

/**
 * Interface of the refresh token model.
 */
export interface IRefreshToken extends ITimestamps, Document {
  /** The token instance, a simple string randomly generated, or null in case the user logged out */
  token: string | null;

  /** The user to whose token belongs to */
  user: typeof Schema.Types.ObjectId;

  /** The date when the token is no longer usable, to generate new access tokens */
  expiryDate: Date;
}

export interface User extends ITimestamps, Document {
  /** Virtual prop representing the user's username, derived from email */
  username: string;

  /** Email of the user registered */
  email: string;

  /** Password of the user, encrypted and with custom getter to return undefined */
  password: string;

  /** Whether the user is admin or not */
  isAdmin: boolean;

  /**
   * The Refresh Token used by the File Storage system to generate new Access Tokens
   * and allow interaction between this API, and teh File Storage API.
   *
   * Until the user connects his/her the File Storage API account with this API,
   * this field will be null.
   */
  fileStorageRefreshToken: string | null;
  /** ID of the user's account in the File Storage Service */
  fileStorageServiceAccountId: string | null;

  // Methods
  /**
   * Check if a password passed belongs to the user.
   * @param password the password about to compare
   * @returns {Boolean} Whether the password is correct or not
   */
  isValidPassword: (password: string) => Promise<boolean>;
}
