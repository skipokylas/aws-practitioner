import { randomUUID } from "node:crypto";
import { toProductResponse } from "../mappers/product-response.mapper";
import { createProductItems } from "../repository/product-table.repository";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
} as const;

type Event = {
  body?: string | null;
};

type CreateProductPayload = {
  count?: number | string;
  description?: string;
  price?: number | string;
  title?: string;
  url?: string;
};

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const toNonNegativeNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const parsePayload = (body: string | null | undefined): CreateProductPayload | null => {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as CreateProductPayload;
  } catch {
    return null;
  }
};

export const handler = async (event: Event) => {
  const payload = parsePayload(event.body);

  if (!payload) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: "Request body must be a valid JSON object" }),
    };
  }

  const title = toNonEmptyString(payload.title);
  const description = toNonEmptyString(payload.description);
  const price = toNonNegativeNumber(payload.price);
  const count = toNonNegativeNumber(payload.count);
  const url = toNonEmptyString(payload.url);

  if (!title || !description || price === null || count === null || !url) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        message:
          'Invalid payload. Required fields: "title" (string), "description" (string), "price" (number >= 0), "count" (number >= 0), "url" (string)',
      }),
    };
  }

  try {
    const id = randomUUID();
    const { product, stock } = await createProductItems({
      id,
      title,
      description,
      price,
      count,
      url,
    });

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(toProductResponse(product, stock)),
    };
  } catch (error) {
    console.error("Failed to create product", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
