import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { startCapEventListener } from './services/cap/capEventListener';

async function bootstrap() {
  await connectDatabase();
  const app = createApp();

  app.listen(env.port, () => {
    console.log(`[server] CROO Hub API listening on port ${env.port}`);
    console.log(`[server] Swagger docs available at http://localhost:${env.port}/api/docs`);
  });

  // Fire-and-forget: startCapEventListener() never throws, so a misconfigured or unreachable
  // CROO Network never prevents the rest of the API from serving requests.
  void startCapEventListener();
}

bootstrap().catch((error) => {
  console.error('[server] Failed to start', error);
  process.exit(1);
});
