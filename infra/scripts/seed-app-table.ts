import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

type SeedRecord = Record<string, string | number | undefined>;
type DynamoAttributeValue = { S: string } | { N: string };
type PutRequest = { PutRequest: { Item: Record<string, DynamoAttributeValue> } };
type TableBatch = Record<string, PutRequest[]>;

type SeedProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
  url: string;
};

const products: SeedProduct[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    title: "Phone",
    description: "Nice phone",
    price: 500,
    count: 12,
    url: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Smartphone.png",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    title: "Laptop",
    description: "Portable workstation",
    price: 1200,
    count: 5,
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Laptop_image.jpg",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    title: "Headphones",
    description: "Noise cancelling",
    price: 180,
    count: 30,
    url: "https://upload.wikimedia.org/wikipedia/commons/8/8b/Headphones.jpg",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    title: "Keyboard",
    description: "Mechanical keyboard",
    price: 90,
    count: 18,
    url: "https://upload.wikimedia.org/wikipedia/commons/9/95/Keyboard_Photo.JPG",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440005",
    title: "Mouse",
    description: "Wireless mouse",
    price: 45,
    count: 25,
    url: "https://upload.wikimedia.org/wikipedia/commons/0/08/A_computer_mouse.jpg",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440006",
    title: "Monitor",
    description: "27-inch display",
    price: 300,
    count: 9,
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a4/Computer_monitor.jpg",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440007",
    title: "Tablet",
    description: "Lightweight tablet",
    price: 400,
    count: 14,
    url: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Tablet_Computer.png",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440008",
    title: "Camera",
    description: "Compact camera",
    price: 650,
    count: 7,
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Digital_Camera.jpg",
  },
];

const PRODUCT_INDEX_PK = "PRODUCT";

const parseFlag = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }

  const value = process.argv[index + 1];
  return value?.startsWith("--") ? undefined : value;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
};

const isDefined = (value: string | number | undefined): value is string | number =>
  value !== undefined;

const toAttributeValue = (value: string | number): DynamoAttributeValue =>
  typeof value === "number" ? { N: String(value) } : { S: value };

const toDynamoItem = (record: SeedRecord): Record<string, DynamoAttributeValue> =>
  Object.fromEntries(
    Object.entries(record)
      .filter((entry): entry is [string, string | number] => isDefined(entry[1]))
      .map(([key, value]) => [key, toAttributeValue(value)]),
  );

const buildBatches = (rows: SeedRow[]): TableBatch[] =>
  chunk(rows, 25).map((batch) =>
    batch.reduce<TableBatch>((accumulator, row) => {
      const request = {
        PutRequest: { Item: toDynamoItem(row.record) },
      };

      accumulator[row.tableName] = [...(accumulator[row.tableName] ?? []), request];
      return accumulator;
    }, {}),
  );

type SeedRow = {
  tableName: string;
  record: SeedRecord;
};

const region =
  parseFlag("--region") ??
  process.env.AWS_REGION ??
  process.env.AWS_DEFAULT_REGION ??
  "eu-central-1";
const profile = parseFlag("--profile") ?? process.env.AWS_PROFILE;
const tableName = parseFlag("--table") ?? "AppTable";

const rows: SeedRow[] = products.flatMap((product) => [
  {
    tableName,
      record: {
        PK: `PRODUCT#${product.id}`,
        SK: "PRODUCT",
        type: "product",
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        url: product.url,
        GSI1PK: PRODUCT_INDEX_PK,
        GSI1SK: product.id,
      },
  },
  {
    tableName,
    record: {
      PK: `PRODUCT#${product.id}`,
      SK: "STOCK",
      type: "stock",
      product_id: product.id,
      count: product.count,
    },
  },
]);

const tempDir = mkdtempSync(join(tmpdir(), "seed-app-table-"));
const requestFile = join(tempDir, "request-items.json");

try {
  const batches = buildBatches(rows);

  for (const [index, batch] of batches.entries()) {
    writeFileSync(requestFile, JSON.stringify(batch, null, 2));

    const args = [
      "dynamodb",
      "batch-write-item",
      "--request-items",
      `file://${requestFile}`,
    ];

    const result = spawnSync("aws", args, {
      env: {
        ...process.env,
        AWS_DEFAULT_REGION: region,
        AWS_PAGER: "",
        AWS_REGION: region,
        ...(profile ? { AWS_PROFILE: profile } : {}),
      },
      stdio: "inherit",
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(`AWS CLI failed while writing batch ${index + 1}`);
    }
  }

  console.log(
    `Seeded ${products.length} products and ${products.length} stock items into ${tableName}.`,
  );
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
