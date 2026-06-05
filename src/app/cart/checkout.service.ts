import { inject, Injectable } from '@angular/core';
import { CartService } from './cart.service';
import { ProductsService } from '../products/products.service';
import { Observable, of } from 'rxjs';
import { ProductCheckout } from '../products/product.interface';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private readonly cartService = inject(CartService);
  private readonly productsService = inject(ProductsService);

  getProductsForCheckout(): Observable<ProductCheckout[]> {
    return this.cartService.cartChanges$.pipe(
      switchMap((cart) => {
        const productIds = Object.keys(cart);

        if (!productIds.length) {
          return of([]);
        }

        return this.productsService.getProductsForCheckout(productIds).pipe(
          map((products) =>
            products.map((product) => ({
              ...product,
              orderedCount: cart[product.id],
              totalPrice: +(cart[product.id] * product.price).toFixed(2),
            })),
          ),
        );
      }),
    );
  }
}
