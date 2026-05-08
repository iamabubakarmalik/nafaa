import { Injectable } from '@nestjs/common';
import * as os from 'os';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const startTime = Date.now();

    let dbStatus = 'OK';
    let dbResponseMs = 0;
    try {
      const t0 = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbResponseMs = Date.now() - t0;
    } catch (e) {
      dbStatus = 'ERROR';
    }

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    const uptimeSeconds = process.uptime();

    return {
      status: dbStatus === 'OK' ? 'HEALTHY' : 'UNHEALTHY',
      checkedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
      database: {
        status: dbStatus,
        responseMs: dbResponseMs,
      },
      server: {
        uptime: uptimeSeconds,
        uptimeHuman: this.humanizeUptime(uptimeSeconds),
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          total: totalMem,
          free: freeMem,
          used: usedMem,
          usedPercent: ((usedMem / totalMem) * 100).toFixed(1),
        },
        cpu: {
          cores: cpus.length,
          model: cpus[0]?.model ?? 'unknown',
          loadAvg: {
            '1min': (loadAvg[0] ?? 0).toFixed(2),
            '5min': (loadAvg[1] ?? 0).toFixed(2),
            '15min': (loadAvg[2] ?? 0).toFixed(2),
          },
        },
      },
    };
  }

  async dbStats() {
    const tableCounts = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.sale.count(),
      this.prisma.customer.count(),
      this.prisma.subscription.count(),
      this.prisma.invoice.count(),
      this.prisma.payment.count(),
      this.prisma.notification.count(),
      this.prisma.activityLog.count(),
    ]);

    return {
      tenants: tableCounts[0],
      users: tableCounts[1],
      products: tableCounts[2],
      sales: tableCounts[3],
      customers: tableCounts[4],
      subscriptions: tableCounts[5],
      invoices: tableCounts[6],
      payments: tableCounts[7],
      notifications: tableCounts[8],
      activityLogs: tableCounts[9],
    };
  }

  private humanizeUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}
