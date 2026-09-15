import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { SupplierLedgerService } from './supplier-ledger.service';
import {
  AddDueDto, AdjustmentDto, OpeningBalanceDto, PaymentDto, ReturnDto,
} from './dto/ledger.dto';

@ApiTags('Supplier Khata')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('supplier-ledger')
export class SupplierLedgerController {
  constructor(private readonly service: SupplierLedgerService) {}

  /** Saare suppliers ka khulasa — KPI cards aur debtor list */
  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser) {
    return this.service.summary(user);
  }

  /** Ek supplier ka poora khata */
  @Get(':supplierId')
  statement(
    @GetUser() user: AuthenticatedUser,
    @Param('supplierId') supplierId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.statement(user, supplierId, { from, to });
  }

  /** Purana khata — system se pehle ka dena */
  @Post(':supplierId/opening-balance')
  opening(@GetUser() user: AuthenticatedUser, @Param('supplierId') supplierId: string, @Body() dto: OpeningBalanceDto) {
    return this.service.setOpeningBalance(user, supplierId, dto);
  }

  /** Udhaar par maal liya */
  @Post(':supplierId/due')
  addDue(@GetUser() user: AuthenticatedUser, @Param('supplierId') supplierId: string, @Body() dto: AddDueDto) {
    return this.service.addDue(user, supplierId, dto);
  }

  /** Supplier ko paisa diya */
  @Post(':supplierId/payment')
  payment(@GetUser() user: AuthenticatedUser, @Param('supplierId') supplierId: string, @Body() dto: PaymentDto) {
    return this.service.recordPayment(user, supplierId, dto);
  }

  /** Maal wapas kiya */
  @Post(':supplierId/return')
  ret(@GetUser() user: AuthenticatedUser, @Param('supplierId') supplierId: string, @Body() dto: ReturnDto) {
    return this.service.recordReturn(user, supplierId, dto);
  }

  /** Haath se durusti */
  @Post(':supplierId/adjustment')
  adjust(@GetUser() user: AuthenticatedUser, @Param('supplierId') supplierId: string, @Body() dto: AdjustmentDto) {
    return this.service.adjust(user, supplierId, dto);
  }

  @Delete(':supplierId/entry/:entryId')
  removeEntry(
    @GetUser() user: AuthenticatedUser,
    @Param('supplierId') supplierId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.service.removeEntry(user, supplierId, entryId);
  }
}
