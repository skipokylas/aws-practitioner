import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import {
  aws_apigateway,
  aws_ec2,
  aws_lambda,
  aws_rds,
  aws_secretsmanager,
} from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "node:path";

export class CartServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new aws_ec2.Vpc(this, "CartServiceVpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: "public",
          subnetType: aws_ec2.SubnetType.PUBLIC,
        },
        {
          name: "private",
          subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    const databaseSecurityGroup = new aws_ec2.SecurityGroup(
      this,
      "CartDatabaseSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
      },
    );

    const lambdaSecurityGroup = new aws_ec2.SecurityGroup(
      this,
      "CartLambdaSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
      },
    );

    databaseSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      aws_ec2.Port.tcp(5432),
      "Allow Cart Lambda to connect to PostgreSQL",
    );

    const credentials = new aws_secretsmanager.Secret(
      this,
      "CartDatabaseCredentials",
      {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: "cart_admin",
          }),
          generateStringKey: "password",
          excludePunctuation: true,
        },
      },
    );

    const database = new aws_rds.DatabaseInstance(this, "CartDatabase", {
      engine: aws_rds.DatabaseInstanceEngine.postgres({
        version: aws_rds.PostgresEngineVersion.VER_16_9,
      }),
      credentials: aws_rds.Credentials.fromSecret(credentials),
      databaseName: "cart_service",
      instanceType: aws_ec2.InstanceType.of(
        aws_ec2.InstanceClass.T4G,
        aws_ec2.InstanceSize.MICRO,
      ),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      vpc,
      vpcSubnets: {
        subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [databaseSecurityGroup],
      publiclyAccessible: false,
      deletionProtection: false,
      removalPolicy: RemovalPolicy.DESTROY,
      backupRetention: Duration.days(0),
    });

    const cartServiceRoot = path.join(__dirname, "..", "..", "cart-service");

    const cartLambda = new NodejsFunction(this, "CartServiceLambda", {
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      entry: path.join(cartServiceRoot, "src", "lambda.ts"),
      handler: "handler",
      projectRoot: cartServiceRoot,
      depsLockFilePath: path.join(cartServiceRoot, "package-lock.json"),
      timeout: Duration.seconds(30),
      memorySize: 512,
      vpc,
      vpcSubnets: {
        subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [lambdaSecurityGroup],
      bundling: {
        target: "node20",
        sourceMap: true,
        nodeModules: [
          "@nestjs/common",
          "@nestjs/core",
          "@nestjs/platform-express",
          "@nestjs/typeorm",
          "@codegenie/serverless-express",
          "class-transformer",
          "class-validator",
          "express",
          "pg",
          "reflect-metadata",
          "rxjs",
          "typeorm",
        ],
      },
      environment: {
        DB_HOST: database.dbInstanceEndpointAddress,
        DB_PORT: database.dbInstanceEndpointPort,
        DB_NAME: "cart_service",
        DB_USERNAME: credentials
          .secretValueFromJson("username")
          .unsafeUnwrap(),
        DB_PASSWORD: credentials
          .secretValueFromJson("password")
          .unsafeUnwrap(),
        DB_SYNCHRONIZE: "true",
        DB_SSL: "true",
      },
    });

    credentials.grantRead(cartLambda);
    database.grantConnect(cartLambda, "cart_admin");

    const api = new aws_apigateway.RestApi(this, "CartServiceApi", {
      restApiName: "Cart Service",
      description: "Cart service API backed by NestJS and PostgreSQL",
      deployOptions: {
        stageName: "prod",
      },
      defaultCorsPreflightOptions: {
        allowMethods: aws_apigateway.Cors.ALL_METHODS,
        allowOrigins: aws_apigateway.Cors.ALL_ORIGINS,
        allowHeaders: aws_apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    api.root.addMethod(
      "GET",
      new aws_apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": JSON.stringify({
                service: "cart-service",
                status: "ok",
              }),
            },
          },
        ],
        passthroughBehavior: aws_apigateway.PassthroughBehavior.NEVER,
        requestTemplates: {
          "application/json": '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
          },
        ],
      },
    );

    const proxy = api.root.addResource("{proxy+}");
    proxy.addMethod("ANY", new aws_apigateway.LambdaIntegration(cartLambda));

    new CfnOutput(this, "CartServiceApiUrl", {
      value: api.url,
      description: "Base URL of Cart Service API",
      exportName: "CartServiceApiUrl",
    });

    new CfnOutput(this, "CartDatabaseEndpoint", {
      value: database.dbInstanceEndpointAddress,
      description: "Cart PostgreSQL endpoint",
      exportName: "CartDatabaseEndpoint",
    });
  }
}
