export interface ProductRecord {
  /** Available count from stock item */
  count: number;
  description: string;
  id: string;
  price: number;
  title: string;
  url?: string;
}

export interface Product extends ProductRecord {
  url: string;
}

export interface ProductCheckout extends Product {
  orderedCount: number;
  /** orderedCount * price */
  totalPrice: number;
}
