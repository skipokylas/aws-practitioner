import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import { aws_apigateway, aws_dynamodb, aws_lambda } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "node:path";

export class ProductServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const lambdaRoot = path.join(
      __dirname,
      "..",
      "lambda",
      "product-service",
    );
    const projectRoot = path.join(__dirname, "..");
    const depsLockFilePath = path.join(projectRoot, "package-lock.json");

    const getProductsList = new NodejsFunction(this, "getProductsList", {
      runtime: aws_lambda.Runtime.NODEJS_22_X,
      entry: path.join(lambdaRoot, "handlers", "get-products-list.handler.ts"),
      description: "Returns a full list of products",
      projectRoot,
      depsLockFilePath,
      bundling: {
        bundleAwsSDK: true,
        sourceMap: true,
        target: "node22",
      },
    });

    const getProductsById = new NodejsFunction(this, "getProductsById", {
      runtime: aws_lambda.Runtime.NODEJS_22_X,
      entry: path.join(lambdaRoot, "handlers", "get-product-by-id.handler.ts"),
      description: "Returns a single product by productId",
      projectRoot,
      depsLockFilePath,
      bundling: {
        bundleAwsSDK: true,
        sourceMap: true,
        target: "node22",
      },
    });

    const createProduct = new NodejsFunction(this, "createProduct", {
      runtime: aws_lambda.Runtime.NODEJS_22_X,
      entry: path.join(lambdaRoot, "handlers", "create-product.handler.ts"),
      description: "Creates a new product",
      projectRoot,
      depsLockFilePath,
      bundling: {
        bundleAwsSDK: true,
        sourceMap: true,
        target: "node22",
      },
    });

    const appTable = aws_dynamodb.Table.fromTableAttributes(
      this,
      "AppTable",
      {
        tableArn: Stack.of(this).formatArn({
          service: "dynamodb",
          resource: "table",
          resourceName: "AppTable",
        }),
        globalIndexes: ["GSI1"],
        grantIndexPermissions: true,
      },
    );

    for (const lambdaFn of [getProductsList, getProductsById, createProduct]) {
      lambdaFn.addEnvironment("APP_TABLE_NAME", "AppTable");
      lambdaFn.addEnvironment("PRODUCTS_GSI_NAME", "GSI1");
      lambdaFn.addEnvironment("PRODUCTS_GSI_PK", "PRODUCT");
    }

    appTable.grantReadData(getProductsList);
    appTable.grantReadData(getProductsById);
    appTable.grantWriteData(createProduct);

    const api = new aws_apigateway.RestApi(this, "ProductServiceApi", {
      restApiName: "Product Service",
      description: "Product service API for frontend integration",
      deployOptions: {
        stageName: "prod",
      },
      defaultCorsPreflightOptions: {
        allowMethods: aws_apigateway.Cors.ALL_METHODS,
        allowOrigins: aws_apigateway.Cors.ALL_ORIGINS,
      },
    });

    const productsResource = api.root.addResource("products");
    productsResource.addMethod(
      "GET",
      new aws_apigateway.LambdaIntegration(getProductsList),
    );
    productsResource.addMethod(
      "POST",
      new aws_apigateway.LambdaIntegration(createProduct),
    );

    const productByIdResource = productsResource.addResource("{productId}");
    productByIdResource.addMethod(
      "GET",
      new aws_apigateway.LambdaIntegration(getProductsById),
    );

    new CfnOutput(this, "ProductServiceApiUrl", {
      value: api.url,
      description: "Base URL of Product Service API",
      exportName: "ProductServiceApiUrl",
    });

    new CfnOutput(this, "ProductsEndpoint", {
      value: `${api.url}products`,
      description: "Products list endpoint",
      exportName: "ProductsEndpoint",
    });
  }
}
