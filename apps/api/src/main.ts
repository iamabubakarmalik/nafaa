import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
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
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // We handle body parsing manually for Stripe webhook
  });

  const configService = app.get(ConfigService);
  const prismaService = app.get(PrismaService);

  const NODE_ENV = configService.get<string>('NODE_ENV') ?? 'development';
  const isProduction = NODE_ENV === 'production';

  // ─── Trust proxy (Railway/Vercel/Cloudflare se aage chalne ke liye CRITICAL) ──
  // Without this, req.ip, secure cookies, rate-limiting sab fail hote hain prod mein
  app.set('trust proxy', 1);

  // ─── Security: Helmet ────────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              connectSrc: ["'self'", 'https:', 'wss:'],
            },
          }
        : false, // Disable CSP in dev for easier debugging
    }),
  );

  app.use(cookieParser());

  // ─── Body parsing (Stripe webhook needs raw body) ────────────────────────────
  app.use('/api/stripe/webhook', bodyParser.raw({ type: 'application/json' }));

  app.use((req: any, res: any, next: any) => {
    if (req.originalUrl === '/api/stripe/webhook') {
      next();
    } else {
      bodyParser.json({ limit: '50mb' })(req, res, next);
    }
  });
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

  // ─── CORS: Smart environment-based configuration ─────────────────────────────
  // PRODUCTION: Only allow nafaa.pk + subdomains (locked down)
  // DEVELOPMENT: Allow localhost + LAN IPs (for Expo Go testing on phone)
  const productionOrigins = [
    'https://nafaa.pk',
    'https://www.nafaa.pk',
    'https://app.nafaa.pk',
    'https://admin.nafaa.pk',
    'https://marketing.nafaa.pk',
    // Vercel preview URLs (Vercel auto-generates preview deployments)
    /^https:\/\/.*\.vercel\.app$/,
  ];

  const developmentOrigins = [
    ...productionOrigins,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8081',
    'http://localhost:19000',
    'http://localhost:19006',
    // LAN IPs (for Expo Go on real device same WiFi)
    /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
    /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
    /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/,
    // Expo Go URLs
    /^exp:\/\/.*$/,
    /^exps:\/\/.*$/,
  ];

  // Allow additional origins via env var (e.g., CORS_EXTRA_ORIGINS=https://staging.nafaa.pk,https://x.com)
  const extraOrigins =
    configService.get<string>('CORS_EXTRA_ORIGINS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

  const allowedOrigins = [
    ...(isProduction ? productionOrigins : developmentOrigins),
    ...extraOrigins,
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((allowed) =>
        typeof allowed === 'string' ? allowed === origin : allowed.test(origin),
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn(`❌ CORS blocked origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Tenant-Id',
    ],
    exposedHeaders: ['Content-Disposition'], // For file downloads
    maxAge: 86400, // 24 hours — cache preflight
  });

  // ─── Static assets (file uploads) ────────────────────────────────────────────
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    maxAge: isProduction ? '7d' : 0, // Cache uploads for 7 days in production
  });

  // ─── Global API prefix ───────────────────────────────────────────────────────
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: '/', method: RequestMethod.GET },
    ],
  });

  // ─── Global validation ───────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Swagger docs (development + staging only — disabled in production) ──────
  if (!isProduction || configService.get('ENABLE_SWAGGER') === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nafaa API')
      .setDescription('Pakistan-first multi-tenant POS and retail management API')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addServer(isProduction ? 'https://api.nafaa.pk' : 'http://localhost:4000', 'Current')
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.log(`📘 Swagger enabled at /docs`);
  }

  // ─── Graceful shutdown ───────────────────────────────────────────────────────
  await prismaService.enableShutdownHooks(app);
  app.enableShutdownHooks();

  // ─── Listen on the correct port + host ───────────────────────────────────────
  // Railway/Heroku/Render set PORT env var. Locally fallback to 4000.
  // Bind 0.0.0.0 (not localhost) so Railway can reach the container.
  const port = configService.get<number>('PORT') ?? 4000;
  const host = '0.0.0.0';

  await app.listen(port, host);

  const publicUrl = isProduction
    ? 'https://api.nafaa.pk'
    : `http://localhost:${port}`;

  logger.log(`🚀 Nafaa API (${NODE_ENV}) running on ${publicUrl}/api`);
  logger.log(`📁 Uploads served at ${publicUrl}/uploads/`);
  if (!isProduction) {
    logger.log(`📘 Swagger docs at ${publicUrl}/docs`);
  }
  logger.log(`🌐 Allowed origins: ${allowedOrigins.length} configured`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Fatal bootstrap error:', err);
  process.exit(1);
});
