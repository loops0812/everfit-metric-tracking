import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env['PORT'] || '3000', 10), // Default to 3000 if PORT is not set
  NODE_ENV: process.env['NODE_ENV']!,
  appName: process.env['APP_NAME']!,
  appVersion: process.env['APP_VERSION']!,
  apiPrefix: process.env['API_PREFIX']!,

  swaggerTitle: process.env['SWAGGER_TITLE']!,
  swaggerPrefix: process.env['SWAGGER_PREFIX']!,
  swaggerDescription: process.env['SWAGGER_DESCRIPTION']!,
  swaggerEnabled: process.env['SWAGGER_ENABLED'] === 'true',
}));

export type AppConfig = ReturnType<typeof appConfig>;
export const APP_CONFIG_KEY = 'app';
