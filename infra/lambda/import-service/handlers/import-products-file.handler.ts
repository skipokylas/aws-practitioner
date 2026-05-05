import { basename } from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET_NAME = process.env.BUCKET_NAME ?? "import-bucket";
const UPLOADED_PREFIX = process.env.UPLOADED_PREFIX ?? "uploaded/";

const client = new S3Client({});

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
} as const;

type Event = {
  queryStringParameters?: {
    name?: string;
  } | null;
};

export const handler = async (event: Event) => {
  const rawName = event.queryStringParameters?.name;
  const fileName = rawName ? basename(rawName.trim()) : "";

  if (!fileName) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Query parameter "name" is required' }),
    };
  }

  const key = `${UPLOADED_PREFIX}${fileName}`;
  const url = await getSignedUrl(
    client,
      new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: "text/csv",
    }),
    {
      expiresIn: 60,
    },
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(url),
  };
};
