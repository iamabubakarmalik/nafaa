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
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
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

    @Patch(':id/toggle')
  toggleActive(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.teamService.toggleActive(user, id);
  }

  @Delete(':id')
  remove(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.teamService.remove(user, id);
  }
}
