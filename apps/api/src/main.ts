import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // We handle body parsing manually for Stripe webhook
  });

  const configService = app.get(ConfigService);
  const prismaService = app.get(PrismaService);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cookieParser());

  // Stripe webhook needs raw body for signature verification
  app.use('/api/stripe/webhook', bodyParser.raw({ type: 'application/json' }));

  // For other routes, use JSON parser
  app.use((req: any, res: any, next: any) => {
    if (req.originalUrl === '/api/stripe/webhook') {
      next();
    } else {
      bodyParser.json({ limit: '50mb' })(req, res, next);
    }
  });
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8081',
      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
      /^exp:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
    ],
    credentials: true,
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix('api');
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nafaa API')
    .setDescription('Pakistan-first multi-tenant POS and retail management API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await prismaService.enableShutdownHooks(app);

  const port = configService.get<number>('PORT') ?? 4000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Nafaa API running on http://localhost:${port}/api`);
  console.log(`📘 Swagger docs on http://localhost:${port}/docs`);
  console.log(`📁 Uploads served at http://localhost:${port}/uploads/`);
}
bootstrap();
