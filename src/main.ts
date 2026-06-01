import 'dotenv/config';
import { buildApp } from './app';
import { config } from './config';
import { prisma } from './config/database';
import { closeRedis } from './config/redis';
import { closeQueues } from './config/queue';

async function main() {
  const app = buildApp();

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    // Cloud Run sends SIGTERM before recycling an instance, then SIGKILL after
    // the grace period — ignore duplicate signals so cleanup runs exactly once.
    if (shuttingDown) return;
    shuttingDown = true;

    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    await closeQueues();
    await prisma.$disconnect();
    await closeRedis();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`Server listening on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
