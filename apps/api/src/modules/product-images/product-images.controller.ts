import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ProductImagesService } from './product-images.service';
import { AddImageDto, ReorderImagesDto } from './dto/add-image.dto';

@ApiTags('Product Images')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products/:productId/images')
export class ProductImagesController {
  constructor(private readonly service: ProductImagesService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.service.list(user, productId);
  }

  @Post()
  add(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() dto: AddImageDto,
  ) {
    return this.service.add(user, productId, dto);
  }

  @Patch('reorder')
  reorder(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() dto: ReorderImagesDto,
  ) {
    return this.service.reorder(user, productId, dto);
  }

  @Patch(':imageId/primary')
  setPrimary(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.service.setPrimary(user, productId, imageId);
  }

  @Delete(':imageId')
  remove(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.service.remove(user, productId, imageId);
  }
}
