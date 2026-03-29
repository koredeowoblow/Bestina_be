import Joi from 'joi';

export const createReturnSchema = Joi.object({
  order: Joi.string().hex().length(24),
  product: Joi.string().hex().length(24).required(),
  reason: Joi.string().required(),
  condition: Joi.string().valid('unopened', 'opened', 'damaged').required()
});

export const evaluateReturnSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  notes: Joi.string()
});
