import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Database
  MONGO_URI: Joi.string().required(),
  MONGO_DB_NAME: Joi.string().required(),
});
