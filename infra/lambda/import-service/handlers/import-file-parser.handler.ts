import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";

const TABLE_BUCKET_NAME = process.env.BUCKET_NAME ?? "import-bucket";

const client = new S3Client({});

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

export const handler = async (event: S3Event) => {
  const csvParser = (await import("csv-parser")) as unknown as (
    options?: Record<string, unknown>,
  ) => NodeJS.ReadWriteStream;

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
      csvParser(),
      new Writable({
        objectMode: true,
        write(recordData, _encoding, callback) {
          console.log(
            `Parsed CSV record from ${bucketName}/${objectKey}: ${JSON.stringify(recordData)}`,
          );
          callback();
        },
      }),
    );
  }
};
