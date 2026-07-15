import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { SaltsService } from './salts.service';
import { UpsertSaltDto } from './dto/upsert-salt.dto';

@ApiTags('Pharmacy - Salts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pharmacy/salts')
export class SaltsController {
  constructor(private readonly service: SaltsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertSaltDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string, @Query('scheduleClass') scheduleClass?: string, @Query('requiresPrescription') requiresPrescription?: string) {
    return this.service.list(user, { search, scheduleClass, requiresPrescription: requiresPrescription === 'true' ? true : undefined });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertSaltDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }

  @Post('assign/:productId') assign(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string, @Body() body: { salts: any[] }) {
    return this.service.assignToProduct(user, productId, body.salts);
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.service.findByProduct(user, productId);
  }
  @Get(':id/products') products(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findProductsBySalt(user, id);
  }
}
