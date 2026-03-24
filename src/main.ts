import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AppConfig, APP_CONFIG_KEY } from './configs/app/app.config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  const appConfiguration = configService.get(APP_CONFIG_KEY) as AppConfig;

  logger.log(`${appConfiguration.appName} v${appConfiguration.appVersion} is starting...`);
  
  // swagger setup
  const { swaggerTitle, swaggerDescription, swaggerPrefix, swaggerEnabled } = appConfiguration;

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle(swaggerTitle)
      .setDescription(swaggerDescription)
      .setVersion(appConfiguration.appVersion)
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      ignoreGlobalPrefix: false, // Include global prefix in Swagger paths
    });
    SwaggerModule.setup(swaggerPrefix, app, document);

    logger.log(`Swagger is enabled at http://localhost:${appConfiguration.port}/${swaggerPrefix}`);
  } else {
    logger.log('Swagger is disabled');
  }

  await app.listen(appConfiguration.port, () => {
    logger.log(`Server is running on http://localhost:${appConfiguration.port}`);
  });
}
bootstrap();
