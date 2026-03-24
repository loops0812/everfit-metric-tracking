import * as Joi from 'joi';
import { NodeEnv } from 'src/commons/enums/node-env.enum';

export const configValidationSchema = Joi.object({
  // App
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid(...Object.values(NodeEnv)).default(NodeEnv.DEVELOPMENT),

  // Swagger
  SWAGGER_TITLE: Joi.string().optional(),
  SWAGGER_PREFIX: Joi.string().required(),
  SWAGGER_DESCRIPTION: Joi.string().optional(),
  SWAGGER_ENABLED: Joi.boolean().default(false),

  // Database
  MONGO_URI: Joi.string().required(),
  MONGO_DB_NAME: Joi.string().required(),
});
