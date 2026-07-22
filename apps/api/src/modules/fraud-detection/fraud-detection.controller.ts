import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FraudActionTaken, FraudRiskLevel } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FraudDetectionService } from './fraud-detection.service';

@ApiTags('Fraud Detection (Admin)')
@Controller('fraud-detection')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FraudDetectionController {
  constructor(private readonly svc: FraudDetectionService) {}

  @Get('suspicious')
  list(@Query('riskLevel') riskLevel?: FraudRiskLevel, @Query('limit') l?: string, @Query('offset') o?: string) {
    return this.svc.listSuspicious({ riskLevel, limit: +(l ?? 50), offset: +(o ?? 0) });
  }

  @Post(':id/review')
  review(@Param('id') id: string, @Body() body: { reviewerId: string; notes: string; action: FraudActionTaken }) {
    return this.svc.review(id, body.reviewerId, body.notes, body.action);
  }

  @Post('devices/:fingerprint/block')
  block(@Param('fingerprint') fp: string, @Body() body: { reason: string }) {
    return this.svc.blockDevice(fp, body.reason);
  }
}
