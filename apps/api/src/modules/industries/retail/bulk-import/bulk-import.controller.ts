import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { BulkImportService } from './bulk-import.service';
import { BulkImportDto } from './dto/bulk-import.dto';

@ApiTags('Retail - Bulk Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('retail/bulk-import')
export class BulkImportController {
  constructor(private readonly service: BulkImportService) {}

  @Post('products')
  importProducts(@GetUser() user: AuthenticatedUser, @Body() dto: BulkImportDto) {
    return this.service.importProducts(user, dto);
  }

  @Get('jobs')
  listJobs(@GetUser() user: AuthenticatedUser) {
    return this.service.listJobs(user);
  }

  @Get('jobs/:id')
  getJob(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getJob(user, id);
  }
}
