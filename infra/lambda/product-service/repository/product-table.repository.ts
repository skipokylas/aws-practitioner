import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.APP_TABLE_NAME ?? "AppTable";
const PRODUCTS_GSI_NAME = process.env.PRODUCTS_GSI_NAME ?? "GSI1";
const PRODUCTS_GSI_PK = process.env.PRODUCTS_GSI_PK ?? "PRODUCT";

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export interface ProductItem {
  PK: string;
  SK: "PRODUCT";
  type: "product";
  id: string;
  title: string;
  description?: string;
  price: number;
  url?: string;
}

export interface StockItem {
  PK: string;
  SK: "STOCK";
  type: "stock";
  product_id: string;
  count: number;
}

export type ProductTableItem = ProductItem | StockItem;

export interface CreateProductInput {
  count: number;
  description: string;
  id: string;
  price: number;
  title: string;
  url: string;
}

type BatchGetRequest = Record<
  string,
  {
    Keys: Array<{ PK: string; SK: string }>;
    ConsistentRead?: boolean;
  }
>;

export const queryAllProductItems = async (): Promise<ProductItem[]> => {
  const items: ProductItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await documentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: PRODUCTS_GSI_NAME,
        KeyConditionExpression: "#gsi1pk = :productType",
        ExpressionAttributeNames: {
          "#gsi1pk": "GSI1PK",
        },
        ExpressionAttributeValues: {
          ":productType": PRODUCTS_GSI_PK,
        },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    items.push(...((response.Items ?? []) as ProductItem[]));
    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
};

export const queryProductItemsById = async (
  productId: string,
): Promise<ProductTableItem[]> => {
  const response = await documentClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: {
        "#pk": "PK",
      },
      ExpressionAttributeValues: {
        ":pk": `PRODUCT#${productId}`,
      },
      ConsistentRead: true,
    }),
  );

  return (response.Items ?? []) as ProductTableItem[];
};

export const queryStockItemsByProductIds = async (
  productIds: string[],
): Promise<StockItem[]> => {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return [];
  }

  const keys = uniqueIds.map((productId) => ({
    PK: `PRODUCT#${productId}`,
    SK: "STOCK",
  }));

  const items: StockItem[] = [];
  let requestItems: BatchGetRequest = {
    [TABLE_NAME]: {
      Keys: keys,
      ConsistentRead: true,
    },
  };

  do {
    const response = await documentClient.send(
      new BatchGetCommand({
        RequestItems: requestItems,
      }),
    );

    items.push(...((response.Responses?.[TABLE_NAME] ?? []) as StockItem[]));
    requestItems = (response.UnprocessedKeys ?? {}) as BatchGetRequest;
  } while (Object.keys(requestItems).length > 0);

  return items;
};

export const createProductItems = async (
  productInput: CreateProductInput,
): Promise<{ product: ProductItem; stock: StockItem }> => {
  const productPartitionKey = `PRODUCT#${productInput.id}`;

  const product: ProductItem = {
    PK: productPartitionKey,
    SK: "PRODUCT",
    type: "product",
    id: productInput.id,
    title: productInput.title,
    description: productInput.description,
    price: productInput.price,
    url: productInput.url,
  };

  const stock: StockItem = {
    PK: productPartitionKey,
    SK: "STOCK",
    type: "stock",
    product_id: productInput.id,
    count: productInput.count,
  };

  await documentClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              ...product,
              GSI1PK: PRODUCTS_GSI_PK,
              GSI1SK: productInput.id,
            },
            ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: stock,
            ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          },
        },
      ],
    }),
  );

  return { product, stock };
};
