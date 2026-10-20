import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../../_shared/constants/marketing-permissions.constants';
import {
  createCustomerBodySchema,
  createTestimonialBodySchema,
  customerConsentBodySchema,
  customerVisibilityBodySchema,
  customersQuerySchema,
  patchCustomerBodySchema,
  patchTestimonialBodySchema,
  testimonialsQuerySchema,
} from '../contract/cms-contract';
import { CmsExceptionFilter } from '../public/cms-exception.filter';
import { parseOr400, userId } from '../public/cms-http';
import { CmsCustomersService } from './cms-customers.service';

type AuthedRequest = { user?: { id?: string } };

/** Admin → Website → Customers and testimonials (API-CONTRACT 8.8). */
@Controller('admin/marketing/cms')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
@UseFilters(CmsExceptionFilter)
export class CmsCustomersController {
  constructor(private readonly svc: CmsCustomersService) {}

  @Get('customers')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  list(@Query() query: unknown) {
    return this.svc.listCustomers(parseOr400(customersQuerySchema, query));
  }

  @Get('customers/:id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  get(@Param('id') id: string) {
    return this.svc.getCustomer(id);
  }

  @Post('customers')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_EDIT)
  create(@Body() body: unknown, @Req() req: AuthedRequest) {
    return this.svc.createCustomer(parseOr400(createCustomerBodySchema, body), userId(req));
  }

  @Patch('customers/:id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_EDIT)
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.svc.updateCustomer(id, parseOr400(patchCustomerBodySchema, body));
  }

  @Post('customers/:id/consent')
  @HttpCode(200)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_PUBLISH)
  consent(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest) {
    return this.svc.setConsent(id, parseOr400(customerConsentBodySchema, body), userId(req));
  }

  @Post('customers/:id/visibility')
  @HttpCode(200)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_PUBLISH)
  visibility(@Param('id') id: string, @Body() body: unknown) {
    return this.svc.setVisibility(id, parseOr400(customerVisibilityBodySchema, body).isPublic);
  }

  @Delete('customers/:id')
  @HttpCode(204)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_PUBLISH)
  async remove(@Param('id') id: string): Promise<void> {
    await this.svc.removeCustomer(id);
  }

  @Get('testimonials')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  testimonials(@Query() query: unknown) {
    return this.svc.listTestimonials(parseOr400(testimonialsQuerySchema, query));
  }

  @Post('testimonials')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_EDIT)
  createTestimonial(@Body() body: unknown, @Req() req: AuthedRequest) {
    return this.svc.createTestimonial(parseOr400(createTestimonialBodySchema, body), userId(req));
  }

  @Patch('testimonials/:id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_EDIT)
  updateTestimonial(@Param('id') id: string, @Body() body: unknown) {
    return this.svc.updateTestimonial(id, parseOr400(patchTestimonialBodySchema, body));
  }

  @Post('testimonials/:id/publish')
  @HttpCode(200)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_PUBLISH)
  publishTestimonial(@Param('id') id: string) {
    return this.svc.publishTestimonial(id);
  }

  @Post('testimonials/:id/unpublish')
  @HttpCode(200)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_PUBLISH)
  unpublishTestimonial(@Param('id') id: string) {
    return this.svc.unpublishTestimonial(id);
  }

  @Delete('testimonials/:id')
  @HttpCode(204)
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_PUBLISH)
  async removeTestimonial(@Param('id') id: string): Promise<void> {
    await this.svc.removeTestimonial(id);
  }
}
