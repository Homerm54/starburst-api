/**
 * Types file, all the types, interfaces, and classes definitions that might
 * be needed on a global scope are here, to easy the imports.
 */

/** Error codes that the Token module can, and will throw */
export type TokenErrorCodes =
  | 'bad-token'
  | 'expired-token'
  | 'unknown-token-error'
  | 'invalid-access-token'
  | 'invalid-refresh-token';

export type AuthorizationErrorCodes =
  | TokenErrorCodes
  | 'email-in-use'
  | 'invalid-password'
  | 'user-not-found'
  | 'unauthorized'
  | 'forbidden';

export const AuthorizartionErrorCodes = {
  /** The email has already been used by another user, and hence, no new user can be created  */
  EMAIL_IN_USE: 'email-in-user' as AuthorizationErrorCodes,

  /** The credentials supplied doens't match the database records  */
  INVALID_CREDENTIALS: 'invalid-credentials' as AuthorizationErrorCodes,

  /** The user searched couldn't be found  */
  USER_NOT_FOUND: 'user-not-found' as AuthorizationErrorCodes,

  /** The passed token is invalid, or malformed  */
  BAD_TOKEN: 'bad-token' as AuthorizationErrorCodes,

  /** The access token supplied either has expired, is malformed, or is invalid  */
  INVALID_ACCESS_TOKEN: 'bad-token' as AuthorizationErrorCodes,

  /** The refresh token supplied either has expired, is malformed, or is invalid  */
  INVALID_REFRESH_TOKEN: 'invalid-refresh-token' as AuthorizationErrorCodes,

  /** The passed token has expired, and thus, is no loger valid  */
  EXPIRED_TOKEN: 'expired-token' as AuthorizationErrorCodes,

  /** An unexpected error ocurred while checking the token  */
  UNKNOWN_ERROR_TOKEN: 'unknown-token-error' as AuthorizationErrorCodes,

  /** The user is not authorized to perform the request  */
  UNAUTHORIZED: 'unauthorized' as AuthorizationErrorCodes,

  /** The request is forbidden  */
  FORBIDDEN: 'forbidden' as AuthorizationErrorCodes,
};

/** Custom Error Class, to ease check in catch statements  */
export class TokenError extends Error {
  readonly code: TokenErrorCodes;

  constructor(codeArg: TokenErrorCodes) {
    super();
    this.code = codeArg;
  }
}
