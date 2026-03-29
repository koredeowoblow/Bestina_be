import Joi from 'joi';
const categoryValidation = {
  create: Joi.object({
    name: Joi.string().required(),
    slug: Joi.string(), // Auto-generated if omitted
    description: Joi.string().allow(''),
    isActive: Joi.boolean()
  }),
  update: Joi.object({
    name: Joi.string(),
    slug: Joi.string(),
    description: Joi.string().allow(''),
    isActive: Joi.boolean()
  })
};

export default categoryValidation;
