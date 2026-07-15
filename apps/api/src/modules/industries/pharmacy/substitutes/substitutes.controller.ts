import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { SubstitutesService } from './substitutes.service';

@ApiTags('Pharmacy - Substitutes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pharmacy/substitutes')
export class SubstitutesController {
  constructor(private readonly service: SubstitutesService) {}

  @Post() add(@GetUser() user: AuthenticatedUser, @Body() body: { mainMedicineId: string; substituteMedicineId: string; notes?: string }) {
    return this.service.add(user, body.mainMedicineId, body.substituteMedicineId, body.notes);
  }
  @Get('by-main/:mainMedicineId') list(@GetUser() user: AuthenticatedUser, @Param('mainMedicineId') mainMedicineId: string) {
    return this.service.list(user, mainMedicineId);
  }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.service.findByProduct(user, productId);
  }
  @Get('auto-suggest/:productId') autoSuggest(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.service.autoSuggest(user, productId);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
