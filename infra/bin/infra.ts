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
const target = String(app.node.tryGetContext("target") ?? "all");
const deployAll = target === "all";
const deployWeb = deployAll || target === "web";
const deployProduct = deployAll || target === "product" || target === "import";
const deployAuth = deployAll || target === "auth" || target === "import";
const deployImport = deployAll || target === "import";
const deployTodo = deployAll || target === "todo";

if (deployWeb) {
  new DeployWebAppStack(app, "DeployWebAppLearningStack", {
    env,
  });
}

const productServiceStack = deployProduct
  ? new ProductServiceStack(app, "ProductServiceStack", { env })
  : undefined;

const authorizationServiceStack = deployAuth
  ? new AuthorizationServiceStack(app, "AuthorizationServiceStack", { env })
  : undefined;

if (deployImport) {
  if (!productServiceStack || !authorizationServiceStack) {
    throw new Error("Import target requires product and auth stacks.");
  }

  new ImportServiceStack(app, "ImportServiceStack", {
    env,
    catalogItemsQueue: productServiceStack.catalogItemsQueue,
    basicAuthorizerFunction: authorizationServiceStack.basicAuthorizerFunction,
  });
}

if (deployTodo) {
  new TodoStack(app, "TodoStackDynamoDB", {
    env,
  });
}
