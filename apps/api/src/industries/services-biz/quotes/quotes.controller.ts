import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { QuotesService } from './quotes.service';
import { ConvertQuoteDto, ListQuotesQuery, RejectQuoteDto, UpsertQuoteDto } from './dto/quote.dto';

/** Reads need service.jobs.view and changes service.jobs.manage (shared `quotes` rule). */
@ApiTags('Service Business - Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/quotes')
export class QuotesController {
  constructor(private readonly service: QuotesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertQuoteDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: ListQuotesQuery) { return this.service.list(user, q); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertQuoteDto) { return this.service.update(user, id, dto); }
  @Post(':id/send') send(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.send(user, id); }
  @Post(':id/accept') accept(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.accept(user, id); }
  @Post(':id/reject') reject(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: RejectQuoteDto) { return this.service.reject(user, id, body.reason); }
  @Post(':id/convert') convert(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ConvertQuoteDto) { return this.service.convertToJob(user, id, body); }
}
