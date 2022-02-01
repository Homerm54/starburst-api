import { timestampPlugIn } from 'database/plugins/timestamps';
import { Schema, model } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcrypt';
import { User } from 'database/types';
import { v4 as uuidv4 } from 'uuid';

const saltRounds = 12;

/** The name of the collection in the MongoDB Database, and where user docs will be saved */
const collectionName = 'users';

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
  let encryptPassword = false;

  const modifiedFields = this.modifiedPaths();
  modifiedFields.forEach((field) => {
    if (field === 'password') encryptPassword = true;
  });

  // Also works for new users
  if (encryptPassword) {
    const hash = await bcrypt.hash(
      this.get('password', null, { getters: false }),
      saltRounds
    );

    this.password = hash;
  }

  next();
});

// Schema Methods
UserSchema.methods.isValidPassword = async function (password) {
  const compare = await bcrypt.compare(
    password,
    this.get('password', null, { getters: false })
  );

  return compare;
};

UserSchema.methods.generateRecoveryCode = async function () {
  const code = uuidv4();

  this.recoveryCode = code;
  await this.save();

  return code;
};

// Single Connection Model
const UserModel = model(collectionName, UserSchema);

export { UserModel };
