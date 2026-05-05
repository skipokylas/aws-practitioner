#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { DeployWebAppStack } from "../lib/deploy-web-app-stack";
import { ProductServiceStack } from "../lib/product-service-stack";
import { TodoStack } from '../lib/todo-dynamodb-stack';

const app = new cdk.App();
const env = { account: "589138972291", region: "eu-central-1" };

new DeployWebAppStack(app, "DeployWebAppLearningStack", {
  env,
});

new ProductServiceStack(app, "ProductServiceStack", {
  env,
});

new TodoStack(app, "TodoStackDynamoDB", {
  env,
});
