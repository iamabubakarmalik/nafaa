import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ReorderService } from './reorder.service';

@ApiTags('Retail - Reorder Suggestions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('retail/reorder')
export class ReorderController {
  constructor(private readonly service: ReorderService) {}

  @Post('generate')
  generate(@GetUser() user: AuthenticatedUser) {
    return this.service.generateSuggestions(user);
  }

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string) {
    return this.service.listWithProducts(user, status || 'PENDING');
  }

  @Patch(':id/status')
  updateStatus(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.service.updateStatus(user, id, body.status);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
