import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { mongoDbConfig } from './configs/database/mongo-db/mongo-db.config';
import { configValidationSchema } from './configs/config.validation';
import { MongoDbModule } from './configs/database/mongo-db/mongo-db.module';
import { MetricsModule } from './metrics/metrics.module';
import { appConfig } from './configs/app/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, mongoDbConfig],
      validationSchema: configValidationSchema,
    }),
    MongoDbModule,
    MetricsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
