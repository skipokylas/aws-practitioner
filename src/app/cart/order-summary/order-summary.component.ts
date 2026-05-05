import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ProductCheckout } from '../../products/product.interface';
import { ProductItemCheckoutComponent } from '../product-item-checkout/product-item-checkout.component';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-order-summary',
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.scss'],
  standalone: true,
  imports: [ProductItemCheckoutComponent, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSummaryComponent {
  products = input.required<ProductCheckout[]>();
  showControls = input.required<boolean>();
  totalPrice = input.required<number>();

  /** Add productId */
  add = output<string>();
  /** Remove productId */
  remove = output<string>();
}
