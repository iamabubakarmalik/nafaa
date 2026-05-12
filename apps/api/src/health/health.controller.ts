import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../modules/auth/decorators/public.decorator';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('/')
  root() {
    return {
      service: 'Nafaa API',
      status: 'ok',
      docs: '/docs',
      api: '/api',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('/health')
  async health() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV ?? 'development',
      database: dbStatus,
    };
  }
}
