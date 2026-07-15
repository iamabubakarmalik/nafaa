import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { DrugInteractionsService } from './drug-interactions.service';
import { UpsertInteractionDto } from './dto/upsert-interaction.dto';

@ApiTags('Pharmacy - Drug Interactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pharmacy/drug-interactions')
export class DrugInteractionsController {
  constructor(private readonly service: DrugInteractionsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertInteractionDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('severity') severity?: string, @Query('saltId') saltId?: string) {
    return this.service.list(user, { severity, saltId });
  }
  @Post('check') check(@GetUser() user: AuthenticatedUser, @Body() body: { saltIds: string[] }) {
    return this.service.check(user, body.saltIds);
  }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertInteractionDto) {
    return this.service.update(user, id, dto);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
