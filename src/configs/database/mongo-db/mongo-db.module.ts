import { Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoDbConfig } from './mongo-db.config';
import { ConfigType } from '@nestjs/config/dist/types/config.type';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (mongoDbConfiguration: ConfigType<typeof mongoDbConfig>) => ({
        uri: mongoDbConfiguration.uri,
        dbName: mongoDbConfiguration.dbName,
        onConnectionCreate: (connection) => {
          const logger = new Logger('MongoDbModule');
          logger.log('MongoDB connection established');
          connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
          });
          connection.on('disconnected', () => {
            logger.warn('MongoDB connection disconnected');
          });
        },
      }),
      inject: [mongoDbConfig.KEY],
    }),
  ],
})
export class MongoDbModule {}
