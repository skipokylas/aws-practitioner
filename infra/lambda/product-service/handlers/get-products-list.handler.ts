import { queryAllProductItems, queryStockItemsByProductIds } from "../repository/product-table.repository";
import { toProductResponse } from "../mappers/product-response.mapper";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
} as const;

export const handler = async () => {
  const productItems = await queryAllProductItems();
  const stockItems = await queryStockItemsByProductIds(
    productItems.map((product) => product.id),
  );

  const stockByProductId = new Map(
    stockItems.map((stockItem) => [stockItem.product_id, stockItem]),
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(
      productItems.map((product) =>
        toProductResponse(product, stockByProductId.get(product.id)),
      ),
    ),
  };
};
