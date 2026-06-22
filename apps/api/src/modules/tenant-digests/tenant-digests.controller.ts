import { Body, Controller, ForbiddenException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { TenantDigestsService } from './tenant-digests.service';

@ApiTags('Tenant Digests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/digests')
export class TenantDigestsController {
  constructor(private readonly digests: TenantDigestsService) {}

  private ensureAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Sirf super admin ye kar sakte hain');
    }
  }

  @Post('low-stock/run')
  @ApiOperation({ summary: 'Manually trigger low stock digest' })
  triggerLowStock(@GetUser() user: AuthenticatedUser) {
    this.ensureAdmin(user);
    return this.digests.runLowStockDigest();
  }

  @Post('daily-summary/run')
  @ApiOperation({ summary: 'Manually trigger daily sales summary' })
  triggerDailySummary(@GetUser() user: AuthenticatedUser) {
    this.ensureAdmin(user);
    return this.digests.runDailySummary();
  }

  @Post('broadcast/send')
  @ApiOperation({ summary: 'Send admin broadcast email to tenants' })
  sendBroadcast(
    @GetUser() user: AuthenticatedUser,
    @Body() body: {
      title: string;
      subject: string;
      message: string;
      ctaText?: string;
      ctaUrl?: string;
      targetType: 'ALL' | 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SPECIFIC';
      targetTenantIds?: string[];
    },
  ) {
    this.ensureAdmin(user);
    return this.digests.sendBroadcast(body);
  }
}
