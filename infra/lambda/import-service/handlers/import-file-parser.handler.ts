import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";

const TABLE_BUCKET_NAME = process.env.BUCKET_NAME ?? "import-bucket";
const CATALOG_ITEMS_QUEUE_URL = process.env.CATALOG_ITEMS_QUEUE_URL ?? "";

const client = new S3Client({});
const sqsClient = new SQSClient({});

type S3Event = {
  Records?: Array<{
    s3?: {
      bucket?: {
        name?: string;
      };
      object?: {
        key?: string;
      };
    };
  }>;
};

const decodeKey = (key: string): string =>
  decodeURIComponent(key.replace(/\+/g, " "));

const loadCsvParser = async () => {
  const module = await import("csv-parser");
  return (module.default ?? module) as (
    options?: Record<string, unknown>,
  ) => NodeJS.ReadWriteStream;
};

export const handler = async (event: S3Event) => {
  if (!CATALOG_ITEMS_QUEUE_URL) {
    throw new Error("Missing CATALOG_ITEMS_QUEUE_URL environment variable");
  }

  const createCsvParser = await loadCsvParser();

  for (const record of event.Records ?? []) {
    const bucketName = record.s3?.bucket?.name ?? TABLE_BUCKET_NAME;
    const objectKey = record.s3?.object?.key;

    if (!objectKey) {
      console.warn("Skipping S3 event record without object key");
      continue;
    }

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: decodeKey(objectKey),
      }),
    );

    if (!response.Body) {
      console.warn(`No body returned for s3://${bucketName}/${objectKey}`);
      continue;
    }

    await pipeline(
      response.Body as NodeJS.ReadableStream,
      createCsvParser(),
      new Writable({
        objectMode: true,
        write(recordData, _encoding, callback) {
          const messageBody = JSON.stringify(recordData);

          sqsClient
            .send(
              new SendMessageCommand({
                QueueUrl: CATALOG_ITEMS_QUEUE_URL,
                MessageBody: messageBody,
              }),
            )
            .then(() => callback())
            .catch(callback);
        },
      }),
    );
  }
};
