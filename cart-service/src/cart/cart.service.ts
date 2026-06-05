import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './cart-item.entity';
import { Cart } from './cart.entity';
import { CartStatus } from './cart-status';

const defaultUserId = 'default-user';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly carts: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly items: Repository<CartItem>,
  ) {}

  async createCart(userId = defaultUserId): Promise<Cart> {
    const existing = await this.carts.findOne({
      where: { userId, status: CartStatus.Open },
      relations: ['items'],
    });

    if (existing) {
      return existing;
    }

    const cart = this.carts.create({
      userId,
      status: CartStatus.Open,
      items: [],
    });

    return this.carts.save(cart);
  }

  async getCart(cartId: string): Promise<Cart> {
    const cart = await this.carts.findOne({
      where: { id: cartId },
      relations: ['items'],
      order: {
        items: {
          productId: 'ASC',
        },
      },
    });

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} was not found`);
    }

    return cart;
  }

  async getOpenCart(userId = defaultUserId): Promise<Cart> {
    return this.createCart(userId);
  }

  async upsertItem(
    cartId: string,
    productId: string,
    count: number,
  ): Promise<Cart> {
    await this.getCart(cartId);

    if (count === 0) {
      await this.deleteItem(cartId, productId);
      return this.getCart(cartId);
    }

    await this.items.save(
      this.items.create({
        cartId,
        productId,
        count,
      }),
    );

    return this.getCart(cartId);
  }

  async deleteItem(cartId: string, productId: string): Promise<Cart> {
    await this.getCart(cartId);
    await this.items.delete({ cartId, productId });
    return this.getCart(cartId);
  }

  async checkout(cartId: string): Promise<Cart> {
    const cart = await this.getCart(cartId);
    cart.status = CartStatus.Ordered;
    return this.carts.save(cart);
  }

  async getTotal(cartId: string): Promise<{ total: number; itemsCount: number }> {
    const cart = await this.getCart(cartId);
    const itemsCount = cart.items.reduce((acc, item) => acc + item.count, 0);

    return {
      total: itemsCount,
      itemsCount,
    };
  }
}
