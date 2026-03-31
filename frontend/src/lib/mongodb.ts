import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  // Intentionally throw in API handlers when invoked without DB config.
  // Keeping this file import-safe for build.
}

type GlobalWithMongoose = typeof globalThis & {
  __veilMongooseConn?: typeof mongoose | null;
  __veilMongoosePromise?: Promise<typeof mongoose> | null;
};

const globalWithMongoose = globalThis as GlobalWithMongoose;

export async function connectMongo() {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI');
  }

  if (globalWithMongoose.__veilMongooseConn) {
    return globalWithMongoose.__veilMongooseConn;
  }

  if (!globalWithMongoose.__veilMongoosePromise) {
    globalWithMongoose.__veilMongoosePromise = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'veil_protocol',
    });
  }

  globalWithMongoose.__veilMongooseConn = await globalWithMongoose.__veilMongoosePromise;
  return globalWithMongoose.__veilMongooseConn;
}
