// src/models/Trip.ts
import mongoose, { Schema, Document, Types } from 'mongoose';
import crypto from 'node:crypto';

export interface ITripMember {
  memberId: string;
  userId?: Types.ObjectId;
  name: string;
  joinedAt: Date;
}

export interface ITrip extends Document {
  name: string;
  currency: string;
  createdBy: Types.ObjectId;
  inviteCode: string;
  members: ITripMember[];
  createdAt: Date;
  updatedAt: Date;
}

const tripMemberSchema = new Schema<ITripMember>(
  {
    memberId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const tripSchema = new Schema<ITrip>(
  {
    name: { type: String, required: true, trim: true },
    currency: { type: String, default: 'INR' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inviteCode: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(4).toString('hex'),
    },
    members: [tripMemberSchema],
  },
  { timestamps: true }
);

export const Trip = mongoose.model<ITrip>('Trip', tripSchema);