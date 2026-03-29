import Joi from 'joi';
const productValidation = {
  create: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    dosageInfo: Joi.string(),
    brand: Joi.string().required(),
    category: Joi.string().hex().length(24).required(),
    price: Joi.number().integer().min(0).required(),
    discountPrice: Joi.number().integer().min(0),
    images: Joi.array().items(
      Joi.object({
        url: Joi.string().required(),
        publicId: Joi.string().required()
      })
    ).min(1).required(),
    stock: Joi.number().min(0).required(),
    prescriptionRequired: Joi.boolean(),
    isArchived: Joi.boolean()
  }),
  update: Joi.object({
    name: Joi.string(),
    description: Joi.string(),
    dosageInfo: Joi.string(),
    brand: Joi.string(),
    category: Joi.string().hex().length(24),
    price: Joi.number().integer().min(0),
    discountPrice: Joi.number().integer().min(0),
    images: Joi.array().items(
      Joi.object({
        url: Joi.string().required(),
        publicId: Joi.string().required()
      })
    ),
    stock: Joi.number().min(0),
    prescriptionRequired: Joi.boolean(),
    isArchived: Joi.boolean()
  }),
  query: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    category: Joi.string().hex().length(24),
    brand: Joi.string(),
    minPrice: Joi.number().integer().min(0),
    maxPrice: Joi.number().integer().min(0),
    search: Joi.string(),
    sort: Joi.string(),
    in_stock: Joi.boolean()
  })
};

export default productValidation;
