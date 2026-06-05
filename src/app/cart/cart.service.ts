import { computed, Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable, of, shareReplay } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { ApiService } from '../core/api.service';

interface CartApiItem {
  productId: string;
  count: number;
}

interface CartApiResponse {
  id: string;
  items?: CartApiItem[];
}

@Injectable({
  providedIn: 'root',
})
export class CartService extends ApiService {
  private readonly storageKey = 'cart_id';
  private readonly userId = 'skipokylas';
  private createCart$?: Observable<string>;

  /** Key - item id, value - ordered amount */
  #cart = signal<Record<string, number>>({});
  #cartChanges = new BehaviorSubject<Record<string, number>>({});

  cart = this.#cart.asReadonly();
  cartChanges$ = this.#cartChanges.asObservable();

  totalInCart = computed(() => {
    const values = Object.values(this.cart());

    if (!values.length) {
      return 0;
    }

    return values.reduce((acc, val) => acc + val, 0);
  });

  constructor() {
    super();
    this.loadRemoteCart();
  }

  addItem(id: string): void {
    this.updateCount(id, 1);
  }

  removeItem(id: string): void {
    this.updateCount(id, -1);
  }

  empty(): void {
    this.setCart({});
  }

  private updateCount(id: string, type: 1 | -1): void {
    if (this.endpointEnabled('cart')) {
      this.updateRemoteCount(id, type);
      return;
    }

    this.updateLocalCount(id, type);
  }

  private updateLocalCount(id: string, type: 1 | -1): void {
    const val = this.cart();
    const newVal = {
      ...val,
    };

    if (!(id in newVal)) {
      newVal[id] = 0;
    }

    if (type === 1) {
      newVal[id] = ++newVal[id];
      this.setCart(newVal);
      return;
    }

    if (newVal[id] === 0) {
      console.warn('No match. Skipping...');
      return;
    }

    newVal[id]--;

    if (!newVal[id]) {
      delete newVal[id];
    }

    this.setCart(newVal);
  }

  private updateRemoteCount(id: string, type: 1 | -1): void {
    const nextCount = Math.max((this.cart()[id] ?? 0) + type, 0);

    this.ensureCart().pipe(
      switchMap((cartId) => {
        const url = this.getUrl('cart', `cart/${cartId}/items/${id}`);

        return nextCount === 0
          ? this.http.delete<CartApiResponse>(url)
          : this.http.patch<CartApiResponse>(url, { count: nextCount });
      }),
    ).subscribe((cart) => this.applyRemoteCart(cart));
  }

  private loadRemoteCart(): void {
    if (!this.endpointEnabled('cart')) {
      return;
    }

    this.http
      .get<CartApiResponse>(this.getUrl('cart', 'cart'), {
        params: {
          userId: this.userId,
        },
      })
      .subscribe((cart) => this.applyRemoteCart(cart));
  }

  private ensureCart(): Observable<string> {
    const cartId = localStorage.getItem(this.storageKey);

    if (cartId) {
      return of(cartId);
    }

    this.createCart$ ??= this.http
      .post<CartApiResponse>(this.getUrl('cart', 'cart'), {
        userId: this.userId,
      })
      .pipe(
        tap((cart) => this.applyRemoteCart(cart)),
        map((cart) => cart.id),
        shareReplay(1),
      );

    return this.createCart$;
  }

  private applyRemoteCart(cart: CartApiResponse): void {
    localStorage.setItem(this.storageKey, cart.id);
    const nextCart = (cart.items ?? []).reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.productId] = item.count;
        return acc;
      },
      {},
    );

    this.setCart(nextCart);
  }

  private setCart(cart: Record<string, number>): void {
    this.#cart.set(cart);
    this.#cartChanges.next(cart);
  }
}
