// src/models/AiLog.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAiLog extends Document {
  tripId: Types.ObjectId;
  inputText: string;
  source: 'receipt' | 'nl_text';
  parsedOutput: Record<string, any>;
  tokensUsed?: number;
  durationMs?: number;
  createdAt: Date;
}

const aiLogSchema = new Schema<IAiLog>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    inputText: { type: String, required: true },
    source: { type: String, enum: ['receipt', 'nl_text'], required: true },
    parsedOutput: { type: Schema.Types.Mixed, required: true },
    tokensUsed: { type: Number },
    durationMs: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AiLog = mongoose.model<IAiLog>('AiLog', aiLogSchema);