import { queryProductItemsById } from "../repository/product-table.repository";
import {
  isProductItem,
  isStockItem,
  toProductResponse,
} from "../mappers/product-response.mapper";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
} as const;

export const handler = async (event: {
  pathParameters?: {
    productId?: string;
  };
}) => {
  const productId = event?.pathParameters?.productId;

  if (!productId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: "Missing productId in request path" }),
    };
  }

  const productItems = await queryProductItemsById(productId);
  const product = productItems.find(isProductItem);

  if (!product) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: `Product with id "${productId}" not found` }),
    };
  }

  const stock = productItems.find(isStockItem);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(toProductResponse(product, stock)),
  };
};
