import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@codegenie/serverless-express';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import express from 'express';
import { AppModule } from './app.module';

let cachedHandler: ReturnType<typeof serverlessExpress>;

async function bootstrap() {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  await app.init();

  return serverlessExpress({ app: expressApp });
}

export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  cachedHandler ??= await bootstrap();
  return cachedHandler(event, context, () => undefined);
};
