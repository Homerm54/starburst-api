/** Error codes that the Token module can, and will throw */
export type BasicErrorCodes = 'user-not-found';

export const DatabaseErrorCodes = {
  /** The User requested doens't exist in the databse */
  USER_NOT_FOUND: 'user-not-found' as BasicErrorCodes,
};

/** Custom Error Class, to ease check in catch statements  */
export class DatabaseError extends Error {
  readonly code: BasicErrorCodes;

  constructor(codeArg: BasicErrorCodes) {
    super();
    this.code = codeArg;
  }
}
