import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfig } from '../app/app.config';

export function setupSwagger(app: INestApplication, config: AppConfig): void {
  const logger = new Logger('Swagger');

  if (!config.swaggerEnabled) {
    logger.log('Swagger is disabled');
    return;
  }

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle(config.swaggerTitle)
      .setDescription(config.swaggerDescription)
      .setVersion(config.appVersion)
      .build(),
  );

  SwaggerModule.setup(config.swaggerPrefix, app, document);
  logger.log(
    `Swagger is available at http://localhost:${config.port}/${config.swaggerPrefix}`,
  );
}
