import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(4000),

  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),

  APP_NAME: Joi.string().default('Nafaa'),
  APP_URL: Joi.string().required(),
  ADMIN_URL: Joi.string().required(),
  MARKETING_URL: Joi.string().required(),

  NAFAA_BANK_NAME: Joi.string().optional(),
  NAFAA_BANK_ACCOUNT_TITLE: Joi.string().optional(),
  NAFAA_BANK_ACCOUNT_NUMBER: Joi.string().optional(),
  NAFAA_BANK_IBAN: Joi.string().optional(),
  NAFAA_JAZZCASH_NUMBER: Joi.string().optional(),
  NAFAA_EASYPAISA_NUMBER: Joi.string().optional(),

  UPLOAD_DIR: Joi.string().default('./uploads'),
  UPLOAD_MAX_SIZE_MB: Joi.number().default(10),

  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional(),

  REFERRAL_REWARD_AMOUNT: Joi.number().default(500),
  REFERRAL_REWARD_PERCENTAGE: Joi.number().default(10),

  RESEND_API_KEY: Joi.string().optional(),
  RESEND_FROM_EMAIL: Joi.string().optional(),
  RESEND_FROM_NAME: Joi.string().optional(),

  SMS_PROVIDER: Joi.string().valid('lifetimesms', 'twilio', 'disabled').default('disabled'),
  LIFETIMESMS_API_KEY: Joi.string().optional(),
  LIFETIMESMS_API_TOKEN: Joi.string().optional(),
  LIFETIMESMS_MASK: Joi.string().optional(),
  LIFETIMESMS_API_URL: Joi.string().optional(),
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_FROM_NUMBER: Joi.string().optional(),

  EMAIL_QUEUE_ENABLED: Joi.boolean().default(true),
  SMS_QUEUE_ENABLED: Joi.boolean().default(true),
});
