#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { ImportServiceStack } from "../lib/import-service-stack";
import { DeployWebAppStack } from "../lib/deploy-web-app-stack";
import { ProductServiceStack } from "../lib/product-service-stack";
import { TodoStack } from '../lib/todo-dynamodb-stack';
import { AuthorizationServiceStack } from "../lib/authorization-service-stack";

const app = new cdk.App();
const env = { account: "589138972291", region: "eu-central-1" };

new DeployWebAppStack(app, "DeployWebAppLearningStack", {
  env,
});

const productServiceStack = new ProductServiceStack(app, "ProductServiceStack", {
  env,
});

const authorizationServiceStack = new AuthorizationServiceStack(
  app,
  "AuthorizationServiceStack",
  { env },
);

new ImportServiceStack(app, "ImportServiceStack", {
  env,
  catalogItemsQueue: productServiceStack.catalogItemsQueue,
  basicAuthorizerFunction: authorizationServiceStack.basicAuthorizerFunction,
});

new TodoStack(app, "TodoStackDynamoDB", {
  env,
});
