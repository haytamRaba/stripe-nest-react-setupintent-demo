import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express'; // ✅ Explicit import types

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Enable CORS for frontend
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    }),
  );

  // ✅ Configure raw body for Stripe webhook signature verification
  app.use('/api/stripe/webhook', (req: Request, res: Response, next: NextFunction) => {
    let rawBody = '';

    // explicitly type chunk as Buffer
    req.on('data', (chunk: Buffer) => {
      rawBody += chunk.toString();
    });

    req.on('end', () => {
      // keep as Buffer for Stripe signature verification
      (req as any).rawBody = Buffer.from(rawBody);
      next();
    });
  });

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`[Server] Application is running on: http://localhost:${port}`);
  console.log(`[Server] Webhook URL: http://localhost:${port}/api/stripe/webhook`);
}

bootstrap();
