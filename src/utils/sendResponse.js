/** Sends a success response with an optional meta object and returns the response object. */
export const sendSuccess = (res, data, message, statusCode = 200, meta) => {
  const responseBody = {
    success: true,
    message,
    data: data ?? null,
  };

  if (meta) {
    responseBody.meta = meta;
  }

  return res.status(statusCode).json(responseBody);
};

/** Sends a standardized error response and returns the response object. */
export const sendError = (res, message, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
};
