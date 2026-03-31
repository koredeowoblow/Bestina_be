import Joi from "joi";
const productValidation = {
  create: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    dosageInfo: Joi.string(),
    brand: Joi.string().required(),
    category: Joi.string().hex().length(24).required(),
    price: Joi.number().integer().min(0).required(),
    discountPrice: Joi.number().integer().min(0),
    images: Joi.forbidden(),
    imageBuffer: Joi.any(),
    imageBuffers: Joi.array().items(Joi.any()),
    stock: Joi.number().min(0).required(),
    prescriptionRequired: Joi.boolean(),
    isArchived: Joi.boolean(),
  }),
  update: Joi.object({
    name: Joi.string(),
    description: Joi.string(),
    dosageInfo: Joi.string(),
    brand: Joi.string(),
    category: Joi.string().hex().length(24),
    price: Joi.number().integer().min(0),
    discountPrice: Joi.number().integer().min(0),
    images: Joi.forbidden(),
    imageBuffer: Joi.any(),
    imageBuffers: Joi.array().items(Joi.any()),
    existingImages: Joi.alternatives().try(
      Joi.array().items(Joi.string().trim()),
      Joi.string().trim(),
    ),
    stock: Joi.number().min(0),
    prescriptionRequired: Joi.boolean(),
    isArchived: Joi.boolean(),
  }),
  query: Joi.object({
    page: Joi.number().min(1).default(1),
    category: Joi.string(),
    brand: Joi.string(),
    minPrice: Joi.number().integer().min(0),
    maxPrice: Joi.number().integer().min(0),
    search: Joi.string(),
    sort: Joi.string(),
    in_stock: Joi.boolean(),
  }),
};

export default productValidation;
