import { ServerError } from 'lib/error';

// Types
/**
 * Types file, all the types, interfaces, and classes definitions that might
 * be needed on a global scope are here, to easy the imports.
 */

/** Error codes that the Token module can, and will throw */
type AuthErrorCodes =
  | 'pending-auth-flow'
  | 'missing-filestorage-access-token'
  | 'invalid-authentication-code'
  | 'invalid-filestorage-access-token'
  | 'invalid-filestorage-refresh-token'
  | 'filestorage-access-denied';

type FileOperationErrorCodes =
  | 'filestorage-too-many-request'
  | 'service-fatal-error';

export type ServiceErrorCodes = AuthErrorCodes | FileOperationErrorCodes;

export const FileStorageErrorCodes = {
  /** The user has not completed the authentication flow, and hence, there's missing data */
  PENDING_AUTH_FLOW: 'pending-auth-flow' as ServiceErrorCodes,

  /** The expected access token to interact with the API is not present in the headers */
  MISSING_ACCESS_TOKEN: 'missing-filestorage-access-token' as ServiceErrorCodes,

  /** The given authentication code is invalid or has expired */
  INVALID_AUTH_CODE: 'invalid-authentication-code' as ServiceErrorCodes,

  /** The access token used is invalid, either expired or malformed  */
  INVALID_ACCESS_TOKEN: 'invalid-filestorage-access-token' as ServiceErrorCodes,

  /** The refresh token has either expired, or is no longer valid */
  INVALID_REFRESH_TOKEN:
    'invalid-filestorage-refresh-token' as ServiceErrorCodes,

  /** The user or app doesn't has the permissions to perform the operations */
  ACCESS_DENIED: 'filestorage-access-denied' as ServiceErrorCodes,

  /** Request from this APP has been blocked temporarily */
  TOO_MANY_REQUEST: 'filestorage-too-many-request' as ServiceErrorCodes,

  /** A fatal or unexpected error ocurred */
  FATAL_ERROR: 'service-fatal-error' as ServiceErrorCodes,
};

/** Custom Error Class, to ease check in catch statements  */
export class FileStorageError extends Error {
  readonly code: ServiceErrorCodes;

  constructor(codeArg: ServiceErrorCodes) {
    super();
    this.code = codeArg;
  }
}

/**
 * Function to catch common errors that might be yield by the File Storage endpoint,
 * regardless of the service or opperation
 */
export function basicErrorInterceptor(error: any) {
  const status = error.response.status;
  const data = error.response.data;

  switch (status) {
    case 401: {
      // Bad or expired access token
      throw new ServerError(
        401,
        FileStorageErrorCodes.INVALID_ACCESS_TOKEN,
        'token has expired or has been revoked by the user'
      );
    }

    case 403: {
      // Account access error, user isn't allowed
      throw new ServerError(
        403,
        FileStorageErrorCodes.ACCESS_DENIED,
        'No token present in response'
      );
    }

    case 429: {
      // Too many request for this app, try again latter
      throw new ServerError(
        429,
        FileStorageErrorCodes.TOO_MANY_REQUEST,
        `Too many request from this API, try again in ${data.retry_after} seconds`
      );
    }

    default:
      throw error;
  }
}
