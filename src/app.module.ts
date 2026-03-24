import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { mongoDbConfig } from './config/database/mongo-db/mongo-db.config';
import { configValidationSchema } from './config/database/config.validation';
import { MongoDbModule } from './config/database/mongo-db/mongo-db.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [mongoDbConfig],
      validationSchema: configValidationSchema,
    }),
    MongoDbModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
