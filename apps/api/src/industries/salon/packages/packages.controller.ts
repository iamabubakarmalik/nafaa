import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { PackagesService } from './packages.service';

@ApiTags('Salon - Packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salon/packages')
export class PackagesController {
  constructor(private readonly service: PackagesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.createPackage(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('active') active?: string, @Query('featured') featured?: string) {
    return this.service.listPackages(user, {
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      featured: featured === 'true' ? true : undefined,
    });
  }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.updatePackage(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.removePackage(user, id); }

  @Post('purchase') purchase(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.purchase(user, dto); }
  @Get('purchases/list') purchases(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string) {
    return this.service.listPurchases(user, { status, customerId });
  }
  @Post('purchases/:id/use') use(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { appointmentId: string }) {
    return this.service.useSession(user, id, body.appointmentId);
  }
}
