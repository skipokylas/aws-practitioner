import { randomUUID } from "node:crypto";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { toProductResponse } from "../mappers/product-response.mapper";
import { createProductItems } from "../repository/product-table.repository";

const CREATE_PRODUCT_TOPIC_ARN = process.env.CREATE_PRODUCT_TOPIC_ARN ?? "";

const snsClient = new SNSClient({});

type SQSRecord = {
  body?: string;
  messageId?: string;
};

type SQSEvent = {
  Records?: SQSRecord[];
};

type BatchItemFailure = {
  itemIdentifier: string;
};

type HandlerResponse = {
  batchItemFailures: BatchItemFailure[];
};

type ProductPayload = {
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

const parsePayload = (body: string | undefined): ProductPayload | null => {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as ProductPayload;
  } catch {
    return null;
  }
};

export const handler = async (event: SQSEvent): Promise<HandlerResponse> => {
  const batchItemFailures: BatchItemFailure[] = [];
  const createdProducts: ReturnType<typeof toProductResponse>[] = [];

  for (const record of event.Records ?? []) {
    const payload = parsePayload(record.body);
    const recordId = record.messageId ?? randomUUID();

    if (!payload) {
      batchItemFailures.push({ itemIdentifier: recordId });
      continue;
    }

    const title = toNonEmptyString(payload.title);
    const description = toNonEmptyString(payload.description);
    const price = toNonNegativeNumber(payload.price);
    const count = toNonNegativeNumber(payload.count);
    const url = toNonEmptyString(payload.url);

    if (!title || !description || price === null || count === null || !url) {
      batchItemFailures.push({ itemIdentifier: recordId });
      continue;
    }

    try {
      const { product, stock } = await createProductItems({
        id: randomUUID(),
        title,
        description,
        price,
        count,
        url,
      });

      createdProducts.push(toProductResponse(product, stock));
    } catch (error) {
      console.error("Failed to create product from SQS message", error);
      batchItemFailures.push({ itemIdentifier: recordId });
    }
  }

  if (createdProducts.length && CREATE_PRODUCT_TOPIC_ARN) {
    await snsClient.send(
      new PublishCommand({
        TopicArn: CREATE_PRODUCT_TOPIC_ARN,
        Subject: `Created ${createdProducts.length} products`,
        Message: JSON.stringify({
          createdAt: new Date().toISOString(),
          count: createdProducts.length,
          products: createdProducts,
        }),
      }),
    );
  }

  return {
    batchItemFailures,
  };
};
