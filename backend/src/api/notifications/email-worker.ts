import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { EmailNotificationService } from './email-notification.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  let stopping = false;
  const stop = () => { stopping = true; };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    do {
      try { await app.get(EmailNotificationService).processPending(); }
      catch {
        console.error('Email worker could not process the queue. Check delivery configuration and database availability.');
        if (!process.argv.includes('--watch')) { process.exitCode = 1; break; }
      }
      if (process.argv.includes('--watch') && !stopping) await new Promise(resolve => setTimeout(resolve, 5000));
    } while (process.argv.includes('--watch') && !stopping);
  } finally { await app.close(); }
}
main().catch(() => { console.error('Email worker startup failed.'); process.exitCode = 1; });
