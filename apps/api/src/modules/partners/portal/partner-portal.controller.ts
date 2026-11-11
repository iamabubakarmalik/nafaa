import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Partner } from '@prisma/client';
import { CurrentPartner, PartnerAllowPending, PartnerGuard } from './partner.guard';
import { LeadInput, PartnerPortalService, VisitInput } from './partner-portal.service';

/** Everything a signed-in partner uses. Only their own data, never a shop's business data. */
@ApiTags('Partner portal')
@UseGuards(PartnerGuard)
@Controller('partner')
export class PartnerPortalController {
  constructor(private readonly portal: PartnerPortalService) {}

  @Get('dashboard')
  dashboard(@CurrentPartner() p: Partner) {
    return this.portal.dashboard(p);
  }

  @Get('leads')
  leads(@CurrentPartner() p: Partner, @Query() q: { stage?: string; search?: string; due?: string; page?: string; limit?: string }) {
    return this.portal.leads(p, q);
  }

  @Post('leads')
  createLead(@CurrentPartner() p: Partner, @Body() body: LeadInput) {
    return this.portal.createLead(p, body ?? {});
  }

  @Get('leads/:id')
  lead(@CurrentPartner() p: Partner, @Param('id') id: string) {
    return this.portal.lead(p, id);
  }

  @Patch('leads/:id')
  updateLead(@CurrentPartner() p: Partner, @Param('id') id: string, @Body() body: LeadInput) {
    return this.portal.updateLead(p, id, body ?? {});
  }

  @Post('visits')
  createVisit(@CurrentPartner() p: Partner, @Body() body: VisitInput) {
    return this.portal.createVisit(p, body ?? {});
  }

  @Get('visits')
  visits(@CurrentPartner() p: Partner, @Query() q: { from?: string; to?: string; page?: string; limit?: string }) {
    return this.portal.visits(p, q);
  }

  @Post('uploads/presign')
  presign(@CurrentPartner() p: Partner, @Body() body: { fileName?: string; contentType?: string; fileSize?: number }) {
    return this.portal.presignPhoto(p, body ?? {});
  }

  @Get('earnings')
  earnings(@CurrentPartner() p: Partner, @Query() q: { status?: string; month?: string; page?: string; limit?: string }) {
    return this.portal.earnings(p, q);
  }

  @Get('payouts')
  payouts(@CurrentPartner() p: Partner) {
    return this.portal.payouts(p);
  }

  @Post('payouts')
  requestPayout(@CurrentPartner() p: Partner) {
    return this.portal.requestPayout(p);
  }

  @Get('statement/:month')
  statement(@CurrentPartner() p: Partner, @Param('month') month: string) {
    return this.portal.statement(p, month);
  }

  @PartnerAllowPending()
  @Patch('profile')
  updateProfile(@CurrentPartner() p: Partner, @Body() body: Record<string, string>) {
    return this.portal.updateProfile(p, body ?? {});
  }

  @Get('kit')
  kit() {
    return this.portal.kit();
  }

  @Get('team')
  team(@CurrentPartner() p: Partner) {
    return this.portal.team(p);
  }
}
