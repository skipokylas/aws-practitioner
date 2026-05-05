import {Injectable} from '@angular/core';

import {EMPTY, Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';

import {Product, ProductRecord} from './product.interface';

import {ApiService} from '../core/api.service';

@Injectable({
  providedIn: 'root',
})
export class ProductsService extends ApiService {
  private toProduct(product: ProductRecord): Product {
    return {
      ...product,
      url: product.url ?? '',
    };
  }

  createNewProduct(product: Product): Observable<Product> {
    if (this.endpointEnabled('product')) {
      const url = this.getUrl('product', 'products');
      return this.http.post<Product>(url, product);
    }

    if (this.endpointEnabled('bff')) {
      const url = this.getUrl('bff', 'products');
      return this.http.post<Product>(url, product);
    }

    console.warn(
      'Endpoints "product" and "bff" are disabled. To enable change your environment.ts config'
    );
    return EMPTY;
  }

  editProduct(id: string, changedProduct: Product): Observable<Product> {
    if (!this.endpointEnabled('bff')) {
      console.warn(
        'Endpoint "bff" is disabled. To enable change your environment.ts config'
      );
      return EMPTY;
    }

    const url = this.getUrl('bff', `products/${id}`);
    return this.http.put<Product>(url, changedProduct);
  }

  getProductById(id: string): Observable<Product | null> {
    if (this.endpointEnabled('product')) {
      const url = this.getUrl('product', `products/${id}`);
      return this.http
        .get<ProductRecord>(url)
        .pipe(map((product) => (product ? this.toProduct(product) : null)));
    }

    if (this.endpointEnabled('bff')) {
      const url = this.getUrl('bff', `products/${id}`);
      return this.http
        .get<{ product: ProductRecord }>(url)
        .pipe(map((resp) => this.toProduct(resp.product)));
    }

    console.warn(
      'Endpoints "product" and "bff" are disabled. Falling back to assets/products.json'
    );
    return this.http
      .get<ProductRecord[]>('/assets/products.json')
      .pipe(
        map((products) => products.find((product) => product.id === id) || null),
        map((product) => (product ? this.toProduct(product) : null)),
      );
  }

  getProducts(): Observable<Product[]> {
    if (this.endpointEnabled('product')) {
      const url = this.getUrl('product', 'products');
      return this.http
        .get<ProductRecord[]>(url)
        .pipe(map((products) => products.map((product) => this.toProduct(product))));
    }

    if (this.endpointEnabled('bff')) {
      const url = this.getUrl('bff', 'products');
      return this.http
        .get<ProductRecord[]>(url)
        .pipe(map((products) => products.map((product) => this.toProduct(product))));
    }

    console.warn(
      'Endpoints "product" and "bff" are disabled. Falling back to assets/products.json'
    );
    return this.http
      .get<ProductRecord[]>('/assets/products.json')
      .pipe(map((products) => products.map((product) => this.toProduct(product))));
  }

  getProductsForCheckout(ids: string[]): Observable<Product[]> {
    if (!ids.length) {
      return of([]);
    }

    return this.getProducts().pipe(
      map((products) => products.filter((product) => ids.includes(product.id)))
    );
  }
}
