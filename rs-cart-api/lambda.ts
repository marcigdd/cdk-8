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

const initializeDatabase = async (client) => {
  try {
    await client.query(`CREATE TYPE cart_status AS ENUM ('OPEN', 'ORDERED')`);
  } catch (err) {
    console.warn('Type cart_status may already exist:', err);
  }
  try {
    await client.query(`
        CREATE TABLE carts (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
          status cart_status NOT NULL
        )
      `);
  } catch (err) {
    console.warn('Table carts may already exist:', err);
  }
  try {
    await client.query(`
        CREATE TABLE cart_items (
          cart_id UUID REFERENCES carts(id),
          product_id UUID,
          count INTEGER
        )
      `);
  } catch (err) {
    console.warn('Table cart_items may already exist:', err);
  }
};

const checkTablesExist = async (client) => {
  const checkTablesQuery = `
      SELECT tablename 
      FROM pg_tables 
      WHERE tablename IN ('carts', 'cart_items')
    `;
  const res = await client.query(checkTablesQuery);
  console.log(
    'Tables found:',
    res.rows.map((row) => row.tablename),
  );
  return res.rows.length === 2; // Both tables exist
};

exports.handler = async function (event: any, context: any) {
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
    await initializeDatabase(client);
    checkTablesExist(client);
    //create a query to check if tables are created
    client.query('SELECT * FROM carts', (err, res) => {
      console.log(err, res);
    });

    console.log('connected to pg client: ');

    // Run your queries here, for example:
    try {
      const res = await client.query('SELECT NOW()');
      console.log('Current time: ', res.rows[0].now);
    } catch (err) {
      console.error('Error running query:', err);
    }

    await client.end();
    console.log('postgres test successfull');

    cachedServer = await bootstrap();
    return proxy(cachedServer, event, context, 'PROMISE').promise;
  } catch (err) {
    console.error('Error retrieving secret:', err);
  }
};
