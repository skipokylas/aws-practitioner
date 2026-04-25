# Shop Angular Cloudfront

Angular version: ~17.

Repo maintainers:

- [Sergey Gultyayev](https://github.com/gultyayev)

## The purpose

The repository was created to have an Angular version of e-shop for EPAM NodeJS AWS course. At the same time we strive to make this repository follows best practices so it may be used as a starter for new projects with all the necessary toolings already set up.

## NodeJS AWS course integration

All the necessary API endpoints are in the environments files `environment.ts` (for dev builds). Also it contains feature flags to enable/disable endpoints invocations from within the app so to ensure that you don't get errors for not implemented API endpoints.

## Contribution

Create an issue with the detailed description of the improvement/issue.

If you would like to help implementing some feature, you should ask the maintainers for approval so to ensure that the feature is desired in the repository and no efforts go wasted.

## Get up and running

Prerequisites: NodeJS LTS v18.x and higher

Follow the steps:

- git clone
- npm i
- ng serve

## Product Service (Task 3)

The infrastructure includes `ProductServiceStack` with:

- `GET /products` -> `getProductsList` Lambda
- `GET /products/{productId}` -> `getProductsById` Lambda

Deploy product service:

- `cd infra`
- `npm run deploy:product -- --profile <your-profile> --region eu-central-1`

After deploy, take `ProductServiceApiUrl` from CloudFormation stack outputs and update:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Set:

- `apiEndpoints.product` to `ProductServiceApiUrl` without trailing `/`
- `apiEndpointsEnabled.product` to `true`

Rebuild frontend:

- `npm run build`

## DynamoDB tables

`TodoStackDynamoDB` now creates one DynamoDB table:

- `AppTable` with composite key `PK` + `SK`

The table stores two entity types:

- `product` items under `PK = PRODUCT#<productId>` and `SK = PRODUCT`
- `stock` items under the same `PK` and `SK = STOCK`

This is the single-table pattern: instead of modeling entities as separate tables, you store related data together and shape the keys around the queries you need. DynamoDB does not enforce foreign keys, so `productId` is a logical link, not a database constraint.

The table also has `GSI1`, which is used for listing all products without scanning the entire table. Product items get:

- `GSI1PK = PRODUCT`
- `GSI1SK = <productId>`

Seed the table with test data from the `infra` package:

- `cd infra`
- `npm run seed:dynamodb -- --profile <your-profile> --region eu-central-1`

You can omit `--profile` if your AWS CLI default profile is already configured.

## Manual deployment flow

If you want to repeat the DynamoDB + API setup yourself:

- `cd infra`
- `npm run deploy:product -- --profile <your-profile> --region eu-central-1`
- `npm run seed:dynamodb -- --profile <your-profile> --region eu-central-1`
- `curl https://<ProductServiceApiUrl>/products`

## Troubleshooting

### Cannot commit

Most likely you are getting a message

> **Commit failed with error**
>
> ...
>
> ✖ subject may not be empty [subject-empty]
>
> ✖ type may not be empty [type-empty]
>
> ✖ found 2 problems, 0 warnings
>
> ⓘ Get help: https://github.com/conventional-changelog/commitlint/#what-is-commitlint
>
> husky - commit-msg script failed (code 1)

To fix it you either need to follow conventional commit messages rules, or remove `.husky/pre-commit` file which enables the aforementioned rule.
