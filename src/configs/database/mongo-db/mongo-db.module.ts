import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoDbConfig } from './mongo-db.config';
import { ConfigType } from '@nestjs/config/dist/types/config.type';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (mongoDbConfiguration: ConfigType<typeof mongoDbConfig>) => ({
        uri: mongoDbConfiguration.uri,
        dbName: mongoDbConfiguration.dbName,
      }),
      inject: [mongoDbConfig.KEY],
    }),
  ],
})
export class MongoDbModule {}
