import AppError from '../errors/AppError.js';
import ERROR_CODES from '../errors/errorCodes.js';

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const errorMessage = result.error.issues
      .map((issue) => issue.message)
      .join(', ');
    return next(new AppError(errorMessage, ERROR_CODES.BAD_REQUEST));
  }

  // Assign parsed/trimmed/lowercased data back to req.body
  if (result.data.body) req.body = result.data.body;
  next();
};

export default validate;
