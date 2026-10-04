import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CommissionService } from './commission.service';
import { UpsertRuleDto } from './dto/upsert-rule.dto';
import { EnrollDto } from './dto/enroll.dto';
import { PayoutDto } from './dto/payout.dto';

@ApiTags('Commission')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commission')
export class CommissionController {
  constructor(private readonly service: CommissionService) {}

  /* ── Rules ── */
  @Get('rules') @ApiOperation({ summary: 'Saare rules' })
  listRules(@GetUser() user: AuthenticatedUser) {
    return this.service.listRules(user);
  }

  @Post('rules') @ApiOperation({ summary: 'Naya rule' })
  createRule(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertRuleDto) {
    return this.service.upsertRule(user, dto);
  }

  @Patch('rules/:id') @ApiOperation({ summary: 'Rule badlein' })
  updateRule(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertRuleDto,
  ) {
    return this.service.upsertRule(user, dto, id);
  }

  @Delete('rules/:id')
  removeRule(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.removeRule(user, id);
  }

  /* ── Kis par chaalu ── */
  @Get('people') @ApiOperation({ summary: 'Bech sakne wale log + HR record' })
  people(@GetUser() user: AuthenticatedUser) {
    return this.service.listPeople(user);
  }

  @Post('enroll') @ApiOperation({ summary: 'Kisi bande par commission chaalu/band' })
  enroll(@GetUser() user: AuthenticatedUser, @Body() dto: EnrollDto) {
    return this.service.setEnrolled(user, dto);
  }

  /* ── Hisab ── */
  @Get('summary') @ApiOperation({ summary: 'Mahine ka poora hisab' })
  summary(@GetUser() user: AuthenticatedUser, @Query('period') period: string) {
    return this.service.summary(user, period);
  }

  @Get('detail/:userId') @ApiOperation({ summary: 'Ek bande ka poora khata — cheez aur bill ke hisab se' })
  detail(
    @GetUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Query('period') period: string,
  ) {
    return this.service.detail(user, userId, period);
  }

  /* ── Adaigi ── */
  @Post('pay')
  pay(@GetUser() user: AuthenticatedUser, @Body() dto: PayoutDto) {
    return this.service.pay(user, dto);
  }

  @Delete('pay/:userId')
  undoPay(
    @GetUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Query('period') period: string,
  ) {
    return this.service.undoPay(user, userId, period);
  }
}
