import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { TodoStack } from "../lib/todo-dynamodb-stack";

test("creates AppTable single-table schema with GSI", () => {
  const app = new cdk.App();
  const stack = new TodoStack(app, "TodoStackDynamoDB");
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::DynamoDB::Table", {
    TableName: "AppTable",
    BillingMode: "PAY_PER_REQUEST",
    KeySchema: [
      {
        AttributeName: "PK",
        KeyType: "HASH",
      },
      {
        AttributeName: "SK",
        KeyType: "RANGE",
      },
    ],
    AttributeDefinitions: Match.arrayWith([
      {
        AttributeName: "PK",
        AttributeType: "S",
      },
      {
        AttributeName: "SK",
        AttributeType: "S",
      },
    ]),
  });

  template.hasResourceProperties("AWS::DynamoDB::Table", {
    GlobalSecondaryIndexes: Match.arrayWith([
      {
        IndexName: "GSI1",
        KeySchema: [
          {
            AttributeName: "GSI1PK",
            KeyType: "HASH",
          },
          {
            AttributeName: "GSI1SK",
            KeyType: "RANGE",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
    ]),
  });
});
