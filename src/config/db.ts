// src/config/db.ts
import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB Atlas connected successfully.');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}