// lambda/index.js
import * as AWS from 'aws-sdk';
import { Client } from 'pg';
import * as express from 'express';
import { Server } from 'http';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { eventContext } from 'aws-serverless-express/middleware';
import * as helmet from 'helmet';
import { createServer, proxy } from 'aws-serverless-express';

let cachedServer: Server;

const bootstrap = async () => {
    if (!cachedServer) {
      const expressApp = express();
      const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(expressApp),
        { cors: true, logger: ['error', 'warn', 'log', 'verbose', 'debug'] },
      );
      app.setGlobalPrefix('cart');
      app.use(eventContext());
      app.use(helmet());
      app.use(helmet.noSniff());
      app.use(helmet.hidePoweredBy());
      app.use(helmet.contentSecurityPolicy());
      await app.init();
      cachedServer = createServer(expressApp, undefined);
    }
    return cachedServer;
  };

exports.handler = async function(event: any, context: any) {
  const secretsManager = new AWS.SecretsManager();
  console.log('Event:', event);
  const secretName = process.env.SECRET_ARN ?? '';
  console.log(secretName);

  try {
    const data = await secretsManager
      .getSecretValue({ SecretId: secretName })
      .promise();
    console.log('Secret:', data.SecretString);
    const secret = JSON.parse(data.SecretString ?? '');
    const client = new Client({
      host: secret.host,
      port: secret.port,
      database: secret.dbname,
      user: secret.username,
      password: secret.password,
    });

    await client.connect();

    console.log('connected to pg client: ');

    // Run your queries here, for example:
    const res = await client.query('SELECT NOW()');
    console.log(res.rows[0].now);

    await client.end();
    console.log('postgres test successfull');

    console.log('Result: ', res);
    cachedServer = await bootstrap();
    return proxy(cachedServer, event, context, 'PROMISE').promise;
  } catch (err) {
    console.error('Error retrieving secret:', err);
  }
};
