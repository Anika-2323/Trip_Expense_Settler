// src/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email?: string;
  passwordHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    passwordHash: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);