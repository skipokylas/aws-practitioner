import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import { aws_lambda } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "node:path";
import * as fs from "node:fs";

export class AuthorizationServiceStack extends Stack {
  readonly basicAuthorizerFunction: aws_lambda.IFunction;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const lambdaRoot = path.join(
      __dirname,
      "..",
      "lambda",
      "authorization-service",
    );
    const projectRoot = path.join(__dirname, "..");
    const depsLockFilePath = path.join(projectRoot, "package-lock.json");

    const envVars = loadEnv(path.join(__dirname, "..", ".env"));

    this.basicAuthorizerFunction = new NodejsFunction(
      this,
      "BasicAuthorizer",
      {
        runtime: aws_lambda.Runtime.NODEJS_22_X,
        projectRoot,
        depsLockFilePath,
        entry: path.join(
          lambdaRoot,
          "handlers",
          "basic-authorizer.handler.ts",
        ),
        description: "Basic HTTP authorizer for Import Service",
        bundling: {
          bundleAwsSDK: true,
          sourceMap: true,
          target: "node22",
        },
        environment: envVars,
      },
    );

    new CfnOutput(this, "BasicAuthorizerFunctionArn", {
      value: this.basicAuthorizerFunction.functionArn,
      description: "ARN of the Basic Authorizer Lambda function",
      exportName: "BasicAuthorizerFunctionArn",
    });
  }
}

function loadEnv(filePath: string): Record<string, string> {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const result: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      if (key) result[key] = value;
    }
    return result;
  } catch {
    console.warn(`Warning: Could not read .env file at ${filePath}`);
    return {};
  }
}
