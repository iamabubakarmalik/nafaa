import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto, UpdateQuotationStatusDto } from './dto/create-quotation.dto';

@ApiTags('Hardware - Quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware/quotations')
export class QuotationsController {
  constructor(private readonly service: QuotationsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateQuotationDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('projectId') projectId?: string, @Query('customerId') customerId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, projectId, customerId, from, to, search });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateQuotationStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/revise') revise(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateQuotationDto) { return this.service.revise(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
