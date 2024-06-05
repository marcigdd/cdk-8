import 'reflect-metadata';
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';

import { CartModule } from './cart/cart.module';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartEntity, CartItemEntity } from './entitities/entitities';
import { ConfigService } from './cart/services/config.service';
import { ConfigModule } from './cart/config/config.module';

@Module({
  imports: [
    ConfigModule, // import ConfigModule
    AuthModule,
    CartModule,
    OrderModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // import ConfigModule
      useFactory: async (configService: ConfigService) => {
        await configService.init();
        console.log('ConfigService:', configService);
        return configService.getDbConfig();
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
