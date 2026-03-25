import { registerAs } from '@nestjs/config';

export const mongoDbConfig = registerAs('mongoDb', () => ({
  uri: process.env['MONGO_URI'],
  dbName: process.env['MONGO_DB_NAME'],
}));
