/** Error codes that the Token module can, and will throw */
export type DatabaseErrorCodes = 'user-not-found';

export const DatabaseErrorCodes = {
  /** The User requested doens't exist in the databse */
  USER_NOT_FOUND: 'user-not-found' as DatabaseErrorCodes,
};

/** Custom Error Class, to ease check in catch statements  */
export class DatabaseError extends Error {
  readonly code: DatabaseErrorCodes;

  constructor(codeArg: DatabaseErrorCodes) {
    super();
    this.code = codeArg;
  }
}
