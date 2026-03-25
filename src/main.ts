import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppConfig, APP_CONFIG_KEY } from './configs/app/app.config';
import { setupSwagger } from './configs/swagger/swagger.config';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService).get<AppConfig>(APP_CONFIG_KEY)!;

  logger.log(`${config.appName} v${config.appVersion} is starting...`);

  app.setGlobalPrefix(config.apiPrefix);

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();
  app.enableShutdownHooks();

  setupSwagger(app, config);

  await app.listen(config.port, () => {
    logger.log(
      `Server is running on http://localhost:${config.port}/${config.apiPrefix}`,
    );
  });
}
void bootstrap();
