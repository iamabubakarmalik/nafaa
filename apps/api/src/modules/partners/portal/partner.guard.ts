import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Partner } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const ALLOW_PENDING = 'partner:allowPending';
/** Lets a partner whose application is still under review (or suspended) use this route. */
export const PartnerAllowPending = () => SetMetadata(ALLOW_PENDING, true);

/** The signed-in partner, loaded by PartnerGuard. */
export const CurrentPartner = createParamDecorator((_: unknown, ctx: ExecutionContext): Partner => ctx.switchToHttp().getRequest().partner);

/**
 * Partner portal routes: the user must be a PARTNER with a partner record.
 * Only ACTIVE partners pass, unless the route allows pending ones.
 */
@Injectable()
export class PartnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { id?: string; role?: string } | undefined;
    if (!user?.id || user.role !== 'PARTNER') throw new ForbiddenException('Partner account zaroori hai');
    const partner = await this.prisma.partner.findUnique({ where: { userId: user.id } });
    if (!partner) throw new ForbiddenException('Partner account nahi mila');
    const allowPending = this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING, [ctx.getHandler(), ctx.getClass()]);
    if (partner.status !== 'ACTIVE' && !allowPending) {
      throw new ForbiddenException(partner.status === 'APPLIED' ? 'Aap ki application abhi review me hai.' : 'Aap ka partner account band hai. Nafaa se rabta karein.');
    }
    req.partner = partner;
    return true;
  }
}
