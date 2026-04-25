import { TestBed } from '@angular/core/testing';

import { ProductsService, resolveProductImageUrl } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should resolve a contextual image for a matching title', () => {
    expect(
      resolveProductImageUrl({
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Gaming Laptop',
        description: 'Portable workstation',
      }),
    ).toContain('Laptop_image.jpg');
  });

  it('should return a stable fallback image when the title is generic', () => {
    expect(
      resolveProductImageUrl({
        id: '550e8400-e29b-41d4-a716-446655440009',
        title: 'ProductAlpha',
        description: 'Short Product Description',
      }),
    ).toMatch(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//);
  });
});
