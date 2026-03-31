import mongoose from 'mongoose';

export async function connectMongo(uri: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  return mongoose.connect(uri);
}

