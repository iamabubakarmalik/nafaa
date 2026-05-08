import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });

  const configService = app.get(ConfigService);
  const prismaService = app.get(PrismaService);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cookieParser());

  const corsOrigins = [
    configService.get<string>('APP_URL'),
    configService.get<string>('ADMIN_URL'),
    configService.get<string>('MARKETING_URL'),
  ].filter((u): u is string => !!u);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix('api', { exclude: ['uploads/(.*)'] });

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
  await app.listen(port);

  console.log(`🚀 Nafaa API running on http://localhost:${port}/api`);
  console.log(`📘 Swagger docs on http://localhost:${port}/docs`);
  console.log(`📁 Uploads served at http://localhost:${port}/uploads/`);
}
bootstrap();
