import Joi from 'joi';
const orderValidation = {
  create: Joi.object({
    addressId: Joi.string().hex().length(24), // Use existing user address
    shippingAddress: Joi.object({
      fullName: Joi.string().required(),
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zip: Joi.string().required(),
      country: Joi.string().required()
    }), // Or provide a new one
    paymentMethod: Joi.string().valid('paystack', 'stripe').required()
  }).xor('addressId', 'shippingAddress'),
  
  updateStatus: Joi.object({
    status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled').required()
  }),
  
  query: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    status: Joi.string(),
    paymentStatus: Joi.string(),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso()
  })
};

export default orderValidation;
