import { timestampPlugIn } from 'database/plugins/timestamps';
import { Schema, model, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { tokenConfig } from 'auth/config';
import ms from 'ms';
import { IRefreshToken, User } from 'database/types';

/** Collection Name in the MongoDB where the tokens will be saved */
const collectionName = 'refresh_tokens';

/** Interface that holds the static methods of the model */
interface RefreshTokenModel extends Model<IRefreshToken> {
  /**
   * Create a new Refresh Token ready to be used by the user.
   * This also removes the used one from the database, this way, a rotatory token system is used
   * where if a refresh token is compromise, it will mitigate the overall attack.
   */
  createToken: (user: User) => Promise<string>;

  /** Checks whether the given token has expired or not */
  verifyExpiration: (token: IRefreshToken) => boolean;
}

const RefreshTokenSchema = new Schema<IRefreshToken, RefreshTokenModel>({
  token: String,

  // This unique token record is associated to an user via ObjectId
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  expiryDate: Date,
});

// --------- Plugins
RefreshTokenSchema.plugin(timestampPlugIn);

// --------- Static Methods
RefreshTokenSchema.statics.createToken = async function (user) {
  const expiredAt = new Date(
    Date.now() + ms(tokenConfig.refreshTokenExpireTime)
  );
  const _token = uuidv4();

  const tokenInstance = await this.findOne({ user: user._id });
  if (tokenInstance) {
    // Updates token in DB with a new random token, this is the rotatory token system
    tokenInstance.token = _token;
    await tokenInstance.save();
  } else {
    // In case teh user doesn't have any refresh token, a new one is created
    const docInstance = new this({
      token: _token,
      user: user._id,
      expiryDate: expiredAt.getTime(),
    });

    await docInstance.save();
  }

  return _token;
};
RefreshTokenSchema.statics.verifyExpiration = (token) => {
  // Check if token is falsy, can happen in case the user logged out
  const expired = token.token ? Date.now() < token.expiryDate.getTime() : true;
  return expired;
};

const RefreshToken = model<IRefreshToken, RefreshTokenModel>(
  collectionName,
  RefreshTokenSchema
);
export { RefreshToken };
