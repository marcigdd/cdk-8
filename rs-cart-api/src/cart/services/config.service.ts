  // config.service.ts
  import { Injectable } from '@nestjs/common';
  import { SecretsManager } from 'aws-sdk';
  import { retry } from 'rxjs';
  import { CartEntity, CartItemEntity } from 'src/entitities/entitities';

  @Injectable()
  export class ConfigService {
    private dbConfig: any;

    async init() {
      const secretsManager = new SecretsManager();
      const secretData = await secretsManager
        .getSecretValue({ SecretId: process.env.SECRET_ARN })
        .promise();
      const secret = JSON.parse(secretData.SecretString ?? '');

      this.dbConfig = {
        host: secret.host,
        port: secret.port,
        username: secret.username,
        password: secret.password,
        database: secret.dbname,
        entities: [CartEntity, CartItemEntity],
        retryAttempts: 2,
        type: 'postgres',
        synchronize: true,
      };
    }

    getDbConfig() {
      return this.dbConfig;
    }
  }
