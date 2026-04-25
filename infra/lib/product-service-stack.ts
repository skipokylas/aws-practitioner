import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import {
  aws_apigateway,
  aws_lambda,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class ProductServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const handlersAssetPath = "lambda/product-service";

    const getProductsList = new aws_lambda.Function(this, "getProductsList", {
      runtime: aws_lambda.Runtime.NODEJS_22_X,
      handler: "get-products-list.handler",
      code: aws_lambda.Code.fromAsset(handlersAssetPath),
      description: "Returns a full list of products",
    });

    const getProductsById = new aws_lambda.Function(this, "getProductsById", {
      runtime: aws_lambda.Runtime.NODEJS_22_X,
      handler: "get-products-by-id.handler",
      code: aws_lambda.Code.fromAsset(handlersAssetPath),
      description: "Returns a single product by productId",
    });

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
