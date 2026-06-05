import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto, UpsertCartItemDto } from './dto';

@Controller('cart')
export class CartController {
  constructor(@Inject(CartService) private readonly cartService: CartService) {}

  @Post()
  createCart(@Body() body: CreateCartDto) {
    return this.cartService.createCart(body.userId);
  }

  @Get()
  getOpenCart(@Query('userId') userId?: string) {
    return this.cartService.getOpenCart(userId);
  }

  @Get(':cartId')
  getCart(@Param('cartId') cartId: string) {
    return this.cartService.getCart(cartId);
  }

  @Post(':cartId/items')
  upsertItem(@Param('cartId') cartId: string, @Body() body: UpsertCartItemDto) {
    return this.cartService.upsertItem(cartId, body.productId, body.count);
  }

  @Patch(':cartId/items/:productId')
  updateItem(
    @Param('cartId') cartId: string,
    @Param('productId') productId: string,
    @Body() body: { count: number },
  ) {
    return this.cartService.upsertItem(cartId, productId, body.count);
  }

  @Delete(':cartId/items/:productId')
  deleteItem(
    @Param('cartId') cartId: string,
    @Param('productId') productId: string,
  ) {
    return this.cartService.deleteItem(cartId, productId);
  }

  @Post(':cartId/checkout')
  checkout(@Param('cartId') cartId: string) {
    return this.cartService.checkout(cartId);
  }

  @Get(':cartId/total')
  getTotal(@Param('cartId') cartId: string) {
    return this.cartService.getTotal(cartId);
  }
}
