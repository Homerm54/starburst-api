import { Schema } from 'mongoose';

interface ITimestamps {
  /** Date when the docuemnt was created and saved in the Database */
  createdAt: Date;

  /** Last time the document was modified and saved, using the .save method */
  updatedAt: Date;
}

/**
 * Stores and updates an updatedAt and createdAt field in the document,
 * **only** when the save method in invoqued.
 *
 * The fields updates are part of the document, and thus are saved in a single operation
 * with all the other fields.
 */
function timestampPlugIn(schema: Schema) {
  // Timestamp fields added dynamically to the Schema
  schema.add({ createdAt: Date, updatedAt: Date });

  // Pre-save hook that will update timestamps fields
  schema.pre('save', function (next) {
    const now = Date.now();

    this.updatedAt = now;
    // Set a value for createdAt only if it is null
    if (!this.createdAt) this.createdAt = now;

    next(); // Next function in the pre-save chain
  });
}

export { timestampPlugIn, ITimestamps };
