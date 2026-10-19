import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { DrugInteractionsService } from './drug-interactions.service';
import { CheckInteractionsDto, UpsertInteractionDto } from './dto/upsert-interaction.dto';

@ApiTags('Pharmacy - Drug Interactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pharmacy/drug-interactions')
export class DrugInteractionsController {
  constructor(private readonly service: DrugInteractionsService) {}

  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertInteractionDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('severity') severity?: string, @Query('saltId') saltId?: string) {
    return this.service.list(user, { severity, saltId });
  }
  @Post('check') check(@GetUser() user: AuthenticatedUser, @Body() body: CheckInteractionsDto) {
    return this.service.check(user, [...new Set(body.saltIds)]);
  }
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertInteractionDto) {
    return this.service.update(user, id, dto);
  }
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
