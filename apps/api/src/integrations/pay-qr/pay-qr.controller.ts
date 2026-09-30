import { BadRequestException, Body, Controller, ForbiddenException, Get, Injectable, Module, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { checkPaymentQr } from './pay-qr';

/**
 * Dukaan ke payment QR (Raast / bank / JazzCash / Easypaisa merchant) —
 * bank ka diya hua QR ek dafa save; POS har bill par usi me raqam daal
 * kar dikhata / chhapta hai. Paisa seedha dukaan ke khate me, Nafaa beech
 * me nahi.
 */
export type QrMethod = 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';
export interface PayQr { method: QrMethod; label: string; payload: string; merchantName: string; scheme: string; amountInQr: boolean; printOnBill: boolean }

const METHODS: QrMethod[] = ['BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];
const MANAGERS = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];
const key = (t: string) => `pay_qr:${t}`;

@Injectable()
export class PayQrService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<PayQr[]> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: key(tenantId) } });
    try { return row?.value ? JSON.parse(row.value) : []; } catch { return []; }
  }

  async save(user: AuthenticatedUser, body: { qrs?: Array<Partial<PayQr>> }) {
    if (!MANAGERS.includes(String(user.role))) throw new ForbiddenException('QR sirf malik ya manager laga sakta hai');
    const input = Array.isArray(body?.qrs) ? body.qrs : [];
    const out: PayQr[] = [];
    for (const q of input) {
      const method = METHODS.includes(q.method as QrMethod) ? (q.method as QrMethod) : null;
      if (!method) throw new BadRequestException('Tareeqa ghalat');
      if (out.some((x) => x.method === method)) throw new BadRequestException('Har tareeqe ka ek hi QR');
      const c = checkPaymentQr(String(q.payload ?? ''));
      if (!c.ok) throw new BadRequestException(c.error);
      out.push({
        method, payload: String(q.payload).trim(), merchantName: c.merchantName, scheme: c.scheme,
        label: String(q.label ?? '').trim().slice(0, 40) || (method === 'BANK_TRANSFER' ? 'Raast / Bank' : method === 'JAZZCASH' ? 'JazzCash' : 'Easypaisa'),
        amountInQr: q.amountInQr !== false, printOnBill: !!q.printOnBill,
      });
    }
    const value = JSON.stringify(out);
    await this.prisma.systemSetting.upsert({
      where: { key: key(user.tenantId) },
      create: { key: key(user.tenantId), value, category: 'payments', isPublic: false },
      update: { value },
    });
    return out;
  }
}

@ApiTags('Payment QR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pay-qr')
export class PayQrController {
  constructor(private readonly svc: PayQrService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.svc.list(user.tenantId);
  }

  @Put()
  save(@GetUser() user: AuthenticatedUser, @Body() body: { qrs?: Array<Partial<PayQr>> }) {
    return this.svc.save(user, body);
  }
}

@Module({ imports: [PrismaModule], controllers: [PayQrController], providers: [PayQrService] })
export class PayQrModule {}
