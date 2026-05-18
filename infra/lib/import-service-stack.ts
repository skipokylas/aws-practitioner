import { CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import {
  aws_apigateway,
  aws_lambda,
  aws_s3,
  aws_s3_notifications,
  aws_sqs,
} from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "node:path";

interface ImportServiceStackProps extends StackProps {
  catalogItemsQueue: aws_sqs.IQueue;
}

export class ImportServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: ImportServiceStackProps) {
    super(scope, id, props);

    const lambdaRoot = path.join(__dirname, "..", "lambda", "import-service");
    const projectRoot = path.join(__dirname, "..");
    const depsLockFilePath = path.join(projectRoot, "package-lock.json");
    const lambdaDefaults = {
      runtime: aws_lambda.Runtime.NODEJS_22_X,
      projectRoot,
      depsLockFilePath,
      bundling: {
        bundleAwsSDK: true,
        sourceMap: true,
        target: "node22",
      },
    } as const;

    const createLambda = (
      id: string,
      entryFile: string,
      description: string,
      environment: Record<string, string>,
    ) =>
      new NodejsFunction(this, id, {
        ...lambdaDefaults,
        entry: path.join(lambdaRoot, "handlers", entryFile),
        description,
        environment,
      });

    const uploadBucket = new aws_s3.Bucket(this, "ImportBucket", {
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [
            aws_s3.HttpMethods.GET,
            aws_s3.HttpMethods.HEAD,
            aws_s3.HttpMethods.PUT,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 3000,
        },
      ],
    });

    const importProductsFile = createLambda(
      "importProductsFile",
      "import-products-file.handler.ts",
      "Returns a signed URL for uploading product CSV files",
      {
        BUCKET_NAME: uploadBucket.bucketName,
        UPLOADED_PREFIX: "uploaded/",
      },
    );

    const importFileParser = createLambda(
      "importFileParser",
      "import-file-parser.handler.ts",
      "Parses uploaded CSV files from S3",
      {
        BUCKET_NAME: uploadBucket.bucketName,
        UPLOADED_PREFIX: "uploaded/",
        CATALOG_ITEMS_QUEUE_URL: props.catalogItemsQueue.queueUrl,
      },
    );

    uploadBucket.grantPut(importProductsFile, "uploaded/*");
    uploadBucket.grantRead(importFileParser, "uploaded/*");
    props.catalogItemsQueue.grantSendMessages(importFileParser);

    uploadBucket.addEventNotification(
      aws_s3.EventType.OBJECT_CREATED,
      new aws_s3_notifications.LambdaDestination(importFileParser),
      {
        prefix: "uploaded/",
      },
    );

    const api = new aws_apigateway.RestApi(this, "ImportServiceApi", {
      restApiName: "Import Service",
      description: "Import service API for CSV uploads",
      deployOptions: {
        stageName: "prod",
      },
      defaultCorsPreflightOptions: {
        allowMethods: aws_apigateway.Cors.ALL_METHODS,
        allowOrigins: aws_apigateway.Cors.ALL_ORIGINS,
      },
    });

    const importResource = api.root.addResource("import");
    importResource.addMethod(
      "GET",
      new aws_apigateway.LambdaIntegration(importProductsFile),
    );

    new CfnOutput(this, "ImportServiceApiUrl", {
      value: api.url,
      description: "Base URL of Import Service API",
      exportName: "ImportServiceApiUrl",
    });

    new CfnOutput(this, "ImportEndpoint", {
      value: `${api.url}import`,
      description: "Import endpoint for CSV uploads",
      exportName: "ImportEndpoint",
    });

    new CfnOutput(this, "ImportBucketName", {
      value: uploadBucket.bucketName,
      description: "Name of the S3 bucket used for imports",
      exportName: "ImportBucketName",
    });
  }
}
