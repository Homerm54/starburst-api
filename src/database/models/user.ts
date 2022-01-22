import { ITimestamps, timestampPlugIn } from 'database/plugins/timestamps';
import { Schema, model, Document } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcrypt';

const saltRounds = 12;

/** The name of the collection in the MongoDB Database, and where user docs will be saved */
const collectionName = 'users';

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

const UserSchema = new Schema<User>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,

      validate: [
        {
          validator: (value: string) => validator.isEmail(value),
          message: 'Invalid email passed',
        },
      ],
    },
    password: {
      type: String,
      required: true,

      // access to the password through user.get('password', null, { getters: false }),
      // this extra step makes sure that password won't be leaked accidentaly
      get: () => undefined,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },

    // Service Related Fields
    // File Storage
    fileStorageRefreshToken: {
      type: String,
      require: false,
      default: null,
    },
    fileStorageServiceAccountId: {
      type: String,
      require: false,
      default: null,
    },
  },
  {
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Virtual Methods
UserSchema.virtual('username').get(function (this: User) {
  return this.email.split('@')[0];
});

// Hooks and Plugins
UserSchema.plugin(timestampPlugIn);

/** Encrypt the user password before saving it */
UserSchema.pre('save', async function (next) {
  const user = this;
  const hash = await bcrypt.hash(
    user.get('password', null, { getters: false }),
    saltRounds
  );

  this.password = hash;
  next();
});

// Schema Methods
UserSchema.methods.isValidPassword = async function (password) {
  const user = this;
  const compare = await bcrypt.compare(
    password,
    user.get('password', null, { getters: false })
  );

  return compare;
};

// Single Connection Model
const UserModel = model(collectionName, UserSchema);

export { UserModel };
