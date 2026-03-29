import Joi from 'joi';
const cartValidation = {
  addItem: Joi.object({
    productId: Joi.string().hex().length(24).required(),
    qty: Joi.number().integer().min(1).default(1)
  }),
  updateItem: Joi.object({
    productId: Joi.string().hex().length(24).required(),
    qty: Joi.number().integer().min(1).required()
  })
};

export default cartValidation;
