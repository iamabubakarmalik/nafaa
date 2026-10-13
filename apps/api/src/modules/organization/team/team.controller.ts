import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { ResetMemberPasswordDto } from './dto/reset-password.dto';
import { SetActiveDto } from './dto/set-active.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { TeamService } from './team.service';

@ApiTags('Team')
@ApiBearerAuth()
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.teamService.list(user);
  }

  @Get('permissions/catalog')
  getCatalog(@GetUser() user: AuthenticatedUser) {
    return this.teamService.getCatalog(user);
  }

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: CreateTeamMemberDto,
  ) {
    return this.teamService.create(user, dto);
  }

  /** Login and HR record together (Staff page). */
  @Post('invite')
  invite(@GetUser() user: AuthenticatedUser, @Body() dto: InviteTeamMemberDto) {
    return this.teamService.invite(user, dto);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.teamService.update(user, id, dto);
  }

  @Post(':id/reset-password')
  resetPassword(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResetMemberPasswordDto,
  ) {
    return this.teamService.resetPassword(user, id, dto.password);
  }

  @Delete(':id/sessions')
  signOutAll(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.teamService.signOut(user, id);
  }

  @Delete(':id/sessions/:sessionId')
  signOutOne(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.teamService.signOut(user, id, sessionId);
  }

  @Patch(':id/permissions')
  updatePermissions(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.teamService.updatePermissions(user, id, dto);
  }

  @Patch(':id/shop')
  updateShop(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { shopId: string | null },
  ) {
    return this.teamService.updateShop(user, id, body.shopId);
  }

  /** Flips the login on/off; with `{ isActive }` it sets that state, so a repeat call changes nothing. */
  @Patch(':id/toggle')
  toggleActive(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetActiveDto,
  ) {
    return this.teamService.toggleActive(user, id, dto?.isActive);
  }

  @Delete(':id')
  remove(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.teamService.remove(user, id);
  }
}
