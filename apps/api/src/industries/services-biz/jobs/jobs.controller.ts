import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { JobsService } from './jobs.service';

@ApiTags('Service Business - Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('priority') priority?: string, @Query('customerId') customerId?: string, @Query('technicianId') technicianId?: string, @Query('businessType') businessType?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, priority, customerId, technicianId, businessType, from, to, search });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) { return this.service.summary(user, from, to); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/assign') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { primaryTechnicianId: string; assistantIds?: string[] }) { return this.service.assignTechnician(user, id, body.primaryTechnicianId, body.assistantIds); }
  @Post(':id/parts') addPart(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.addPart(user, id, dto); }
  @Patch(':id/parts/:partId/remove') removePart(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('partId') partId: string) { return this.service.removePart(user, id, partId); }
  @Post(':id/payments') addPayment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number; isAdvance?: boolean }) { return this.service.addPayment(user, id, body.amount, body.isAdvance); }
  @Post(':id/rating') rating(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { rating: number; feedback?: string; wouldRecommend?: boolean; satisfaction?: string }) { return this.service.submitRating(user, id, body.rating, body.feedback, body.wouldRecommend, body.satisfaction); }
  @Post(':id/signature') signature(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { signatureUrl: string }) { return this.service.uploadCompletionSignature(user, id, body.signatureUrl); }
  @Post(':id/photos/:stage') photos(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('stage') stage: 'before' | 'during' | 'after', @Body() body: { urls: string[] }) { return this.service.addPhotos(user, id, stage, body.urls); }
  @Post(':id/return-visit') returnVisit(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.createReturnVisit(user, id, dto); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string }) { return this.service.cancel(user, id, body.reason); }
}
