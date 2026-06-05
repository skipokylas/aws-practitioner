import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Cart } from './cart.entity';

@Entity({ name: 'cart_items' })
export class CartItem {
  @PrimaryColumn({ name: 'cart_id', type: 'uuid' })
  cartId!: string;

  @PrimaryColumn({ name: 'product_id', type: 'varchar' })
  productId!: string;

  @Column({ type: 'integer' })
  count!: number;

  @ManyToOne(() => Cart, (cart) => cart.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cart_id' })
  cart!: Cart;
}
