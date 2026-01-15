const Joi = require('joi');

/**
 * Schema for validating incoming notification messages
 * All 4 fields must be non-empty strings
 */
const messageSchema = Joi.object({
  identifier: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'identifier cannot be empty',
    'string.max': 'identifier cannot exceed 255 characters',
    'any.required': 'identifier is required',
  }),
  type: Joi.string().min(1).required().messages({
    'string.empty': 'type cannot be empty',
    'any.required': 'type is required',
  }),
  deviceId: Joi.string().min(1).required().messages({
    'string.empty': 'deviceId cannot be empty',
    'any.required': 'deviceId is required',
  }),
  text: Joi.string().min(1).required().messages({
    'string.empty': 'text cannot be empty',
    'any.required': 'text is required',
  }),
}).unknown(true); // Allow extra fields

/**
 * Validate a notification message
 * @param {object} message - The message to validate
 * @returns {{ valid: boolean, error?: string, value?: object }}
 */
function validateMessage(message) {
  const { error, value } = messageSchema.validate(message, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    const errors = error.details.map((d) => d.message).join('; ');
    return {
      valid: false,
      error: errors,
    };
  }

  return {
    valid: true,
    value,
  };
}

module.exports = {
  validateMessage,
  messageSchema,
};
