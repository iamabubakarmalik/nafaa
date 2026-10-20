/**
 * Guarantor (zamin) on a qist plan. Plans are made through the shared
 * /emi-plans API; an appliance shop takes a guarantor for each one, so the
 * name, phone, CNIC and address are kept on the plan for the agreement print.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { QistGuarantorDto } from './dto/guarantor.dto';

/** 3520212345671 → 35202-1234567-1 */
const cnic = (v: string) => {
  const d = v.replace(/\D/g, '');
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
};

@Injectable()
export class QistGuarantorService {
  constructor(private readonly prisma: PrismaService) {}

  async set(user: AuthenticatedUser, planId: string, dto: QistGuarantorDto) {
    const plan = await this.prisma.emiPlan.findFirst({ where: { id: planId, tenantId: user.tenantId }, select: { id: true, status: true, customerPhone: true } });
    if (!plan) throw new NotFoundException('Qist plan nahi mila');
    if (plan.status === 'CANCELLED') throw new BadRequestException('Cancel plan par zamin nahi badalta');
    const phone = dto.guarantorPhone?.trim() || null;
    if (phone && plan.customerPhone && phone.replace(/\D/g, '').slice(-10) === plan.customerPhone.replace(/\D/g, '').slice(-10)) {
      throw new BadRequestException('Zamin customer khud nahi ho sakta — kisi aur ka phone likhein');
    }
    return this.prisma.emiPlan.update({
      where: { id: plan.id },
      data: { guarantorName: dto.guarantorName.trim(), guarantorPhone: phone, guarantorCnic: cnic(dto.guarantorCnic), guarantorAddress: dto.guarantorAddress?.trim() || null },
      select: { id: true, planNumber: true, guarantorName: true, guarantorPhone: true, guarantorCnic: true, guarantorAddress: true },
    });
  }
}
