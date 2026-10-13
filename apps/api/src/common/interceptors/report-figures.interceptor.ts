import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PERMISSIONS } from '../constants/permissions.constants';
import { hiddenFigures, isOwnerRole } from '../helpers/reports-config.helper';
import { PrismaService } from '../../prisma/prisma.service';
import { stripCostKeys } from './cost-masking.interceptor';

/**
 * Applies Settings → Reports → "money figures staff may see" to a report
 * controller. When the shop hides profit from staff, a non-owner's request
 * runs as if they had no `cost.view`, and cost and profit keys are removed
 * from the response, as the cost-masking interceptor does.
 *
 * It only ever takes a figure away; it never adds a permission. Drawer
 * figures are removed by the report services, which know their own fields.
 */
@Injectable()
export class ReportFiguresInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const user = req?.user;
    if (!user?.tenantId || isOwnerRole(user.role)) return next.handle();

    const hidden = await hiddenFigures(this.prisma, user);
    if (!hidden.includes('profit')) return next.handle();

    req.user = { ...user, permissions: (user.permissions ?? []).filter((p: string) => p !== PERMISSIONS.COST_VIEW) };
    return next.handle().pipe(map((body) => stripCostKeys(body)));
  }
}
