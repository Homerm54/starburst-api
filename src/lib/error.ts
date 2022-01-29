import { AuthorizationErrorCodes, TokenErrorCodes } from 'auth/error';

type ErrorCodes =
  | TokenErrorCodes
  | AuthorizationErrorCodes
  | 'unknown-error'
  | 'unauthorized'
  | 'invalid-params' // The request was made with missing or invalid parameters
  | 'forbidden';

/**
 * Errors thrown in the middlewares, used to keep an error structure with all needs
 * to allow the error handler middleware take an action.
 */
class ServerError extends Error {
  readonly statusCode: number;
  readonly message: string;
  readonly code: ErrorCodes;

  constructor(statusCode: number, code: ErrorCodes, message: string) {
    super(message);

    this.code = code;
    this.statusCode = statusCode;
    this.message = message;
  }
}

export { ServerError };
