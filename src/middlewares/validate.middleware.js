import AppError from '../utils/AppError.js';
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((details) => details.message).join(', ');
      return next(new AppError(`Validation Error: ${errorMessage}`, 400));
    }

    // Replace request data with validated data (applies default values and strips unknown keys)
    req[source] = value;
    return next();
  };
};

export default validate;
