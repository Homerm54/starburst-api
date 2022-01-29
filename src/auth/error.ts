/**
 * Types file, all the types, interfaces, and classes definitions that might
 * be needed on a global scope are here, to easy the imports.
 */

/** Error codes that the Token module can, and will throw */
export type TokenErrorCodes =
  /** The passed token is invalid, or malformed  */
  | 'bad-token'
  /** The passed token has expired, and thus, is no loger valid  */
  | 'expired-token'
  /** An unexpected error ocurred while checking the token  */
  | 'unknown-token-error';

export type AuthorizationErrorCodes =
  | 'email-in-use'
  | 'invalid-password'
  | 'user-not-found'
  | 'invalid-access-token'
  | 'invalid-refresh-token';

export const Codes = {
  EMAIL_IN_USE: 'email-in-user' as AuthorizationErrorCodes,
  INVALID_PASSWORD: 'invalid-password' as AuthorizationErrorCodes,
  USER_NOT_FOUND: 'user-not-found' as AuthorizationErrorCodes,
  BAD_TOKEN: 'bad-token' as AuthorizationErrorCodes,

  INVALID_ACCESS_TOKEN: 'bad-token' as TokenErrorCodes,
  INVALID_REFRESH_TOKEN: 'invalid-refresh-token' as AuthorizationErrorCodes,
  EXPIRED_TOKEN: 'expired-token' as TokenErrorCodes,
  UNKNOWN_ERROR_TOKEN: 'unknown-token-error' as TokenErrorCodes,
};

/** Custom Error Class, to ease check in catch statements  */
export class TokenError extends Error {
  readonly code: TokenErrorCodes;

  constructor(codeArg: TokenErrorCodes) {
    super();
    this.code = codeArg;
  }
}
