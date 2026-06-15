import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { EmiService } from './emi.service';
import { CreateEmiDto } from './dto/create-emi.dto';

@ApiTags('Industry: Mobile - EMI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('industries/mobile/emi')
export class EmiController {
  constructor(private readonly service: EmiService) {}

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser) { return this.service.stats(user); }

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string) {
    return this.service.list(user, status);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateEmiDto) {
    return this.service.create(user, dto);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post(':id/installments/:installmentId/pay')
  payInstallment(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @Body() body: { amount: number },
  ) {
    return this.service.payInstallment(user, id, installmentId, body.amount);
  }

  @Patch(':id/cancel')
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.cancel(user, id);
  }
}
