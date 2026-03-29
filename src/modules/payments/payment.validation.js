import Joi from 'joi';

export const initializePaymentSchema = Joi.object({
  orderId: Joi.string().required(),
  provider: Joi.string().valid('paystack', 'stripe').required(),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().required(),
});

export const refundPaymentSchema = Joi.object({
  reference: Joi.string().required(),
  provider: Joi.string().valid('paystack', 'stripe').required(),
  reason: Joi.string().optional()
});
