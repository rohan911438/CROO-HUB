import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';

async function bootstrap() {
  await connectDatabase();
  const app = createApp();

  app.listen(env.port, () => {
    console.log(`[server] CROO Hub API listening on port ${env.port}`);
    console.log(`[server] Swagger docs available at http://localhost:${env.port}/api/docs`);
  });
}

bootstrap().catch((error) => {
  console.error('[server] Failed to start', error);
  process.exit(1);
});
