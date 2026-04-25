import type {
  ProductItem,
  ProductTableItem,
  StockItem,
} from "../repository/product-table.repository";

export interface ProductResponse {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
  url: string;
}

export const isProductItem = (
  item: ProductTableItem,
): item is ProductItem => item.SK === "PRODUCT";

export const isStockItem = (item: ProductTableItem): item is StockItem =>
  item.SK === "STOCK";

export const toProductResponse = (
  product: ProductItem,
  stock?: StockItem,
): ProductResponse => {
  return {
    id: product.id,
    title: product.title,
    description: product.description ?? "",
    price: Number(product.price),
    count: Number(stock?.count ?? 0),
    url: product.url ?? "",
  };
};
