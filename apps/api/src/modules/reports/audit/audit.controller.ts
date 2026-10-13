import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { AuditService } from './audit.service';
import { AuditEventsDto, AuditFilterDto, AuditLoginsDto } from './dto/audit.dto';
import { ReportFiguresInterceptor } from '../../../common/interceptors/report-figures.interceptor';

/** Audit and loss prevention report. Read-only; needs the activity log permission. */
@ApiTags('Audit Report')
@ApiBearerAuth()
@UseInterceptors(ReportFiguresInterceptor)
@Controller('reports/audit')
@RequirePermissions(PERMISSIONS.ACTIVITY_VIEW)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  /** Totals, previous period, charts, staff risk scores and the watch list. */
  @Get()
  overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: AuditFilterDto) {
    return this.service.overview(user, shop, q);
  }

  /** Paged timeline of risky events, filtered by type, severity and search. */
  @Get('events')
  events(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: AuditEventsDto) {
    return this.service.events(user, shop, q);
  }

  /** Login history with failed attempts, new devices and logins outside shop hours. */
  @Get('logins')
  logins(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: AuditLoginsDto) {
    return this.service.logins(user, shop, q);
  }
}
