import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ProcessSalaryDto } from './dto/process-salary.dto';

@ApiTags('Staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser) {
    return this.service.stats(user);
  }

  @Get('attendance/today')
  todayAttendance(@GetUser() user: AuthenticatedUser) {
    return this.service.todayAttendance(user);
  }

  @Post('attendance')
  markAttendance(@GetUser() user: AuthenticatedUser, @Body() dto: MarkAttendanceDto) {
    return this.service.markAttendance(user, dto);
  }

  @Get('attendance/:staffId')
  getAttendance(
    @GetUser() user: AuthenticatedUser,
    @Param('staffId') staffId: string,
    @Query('month') month?: string,
  ) {
    return this.service.getAttendance(user, staffId, month);
  }

  @Post('leaves')
  createLeave(@GetUser() user: AuthenticatedUser, @Body() dto: CreateLeaveDto) {
    return this.service.createLeave(user, dto);
  }

  @Post('leaves/:id/approve')
  approveLeave(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.approveLeave(user, id);
  }

  @Post('leaves/:id/reject')
  rejectLeave(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.rejectLeave(user, id, body?.reason);
  }

  @Get('salaries')
  getSalaries(@GetUser() user: AuthenticatedUser, @Query('staffId') staffId?: string) {
    return this.service.getSalaryPayments(user, staffId);
  }

  @Get('salaries/:id')
  getSalary(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getSalaryPayment(user, id);
  }

  @Post('salaries')
  processSalary(@GetUser() user: AuthenticatedUser, @Body() dto: ProcessSalaryDto) {
    return this.service.processSalary(user, dto);
  }

  @Post(':staffId/documents')
  addDocument(
    @GetUser() user: AuthenticatedUser,
    @Param('staffId') staffId: string,
    @Body() body: any,
  ) {
    return this.service.addDocument(user, staffId, body);
  }

  @Delete(':staffId/documents/:docId')
  removeDocument(
    @GetUser() user: AuthenticatedUser,
    @Param('staffId') staffId: string,
    @Param('docId') docId: string,
  ) {
    return this.service.removeDocument(user, staffId, docId);
  }

  @Get()
  findAll(
    @GetUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(user, search, status);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateStaffDto) {
    return this.service.create(user, dto);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
