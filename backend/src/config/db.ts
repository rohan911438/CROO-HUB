import mongoose from 'mongoose';
import { env } from './env';

mongoose.set('strictQuery', true);

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectDatabase(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await mongoose.connect(env.mongodbUri);
      console.log(`[db] connected -> ${mongoose.connection.name}`);

      mongoose.connection.on('disconnected', () => {
        console.warn('[db] disconnected');
      });
      return;
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      console.error(
        `[db] connection attempt ${attempt}/${MAX_RETRIES} failed: ${(error as Error).message}`,
      );

      if (isLastAttempt) {
        console.error(
          `[db] could not reach MongoDB at ${env.mongodbUri}. ` +
            'Make sure MongoDB is running (e.g. `docker compose up -d mongo`) and MONGODB_URI in .env is correct.',
        );
        process.exit(1);
      }

      await wait(RETRY_DELAY_MS);
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
