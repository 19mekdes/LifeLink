import { validationResult, body, param, query } from 'express-validator';

/**
 * Check for validation errors and return them
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/users', validate, createUser);
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  errors.array().forEach(err => {
    extractedErrors.push({
      field: err.path,
      message: err.msg,
      value: err.value
    });
  });

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: extractedErrors
  });
};

/**
 * Common validation rules for IDs
 */
export const idValidation = [
  param('id')
    .notEmpty()
    .withMessage('ID is required')
    .isString()
    .withMessage('ID must be a string')
    .isLength({ min: 10 })
    .withMessage('Invalid ID format')
];

export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('sortBy')
    .optional()
    .isString()
    .withMessage('Sort by must be a string')
    .trim(),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

export const searchValidation = [
  query('search')
    .optional()
    .isString()
    .withMessage('Search term must be a string')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),

  query('searchBy')
    .optional()
    .isString()
    .withMessage('Search by must be a string')
    .trim()
];

/**
 * Validation for email
 */
export const emailValidation = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

/**
 * Validation for password
 */
export const passwordValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number')
];

/**
 * Validation for phone number
 */
export const phoneValidation = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

/**
 * Validation for Ethiopian phone number
 */
export const ethiopianPhoneValidation = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .custom((value) => {
      // Ethiopian phone format: +251XXXXXXXXX or 09XXXXXXXX
      const phoneRegex = /^(\+251|0)?[0-9]{9}$/;
      if (!phoneRegex.test(value)) {
        throw new Error('Phone must be a valid Ethiopian number (e.g., +251911111111 or 0911111111)');
      }
      return true;
    })
];

/**
 * Validation for blood type
 */
export const bloodTypeValidation = [
  body('bloodType')
    .notEmpty()
    .withMessage('Blood type is required')
    .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
    .withMessage('Invalid blood type')
];

/**
 * Validation for urgency level
 */
export const urgencyValidation = [
  body('urgency')
    .optional()
    .isIn(['NORMAL', 'URGENT', 'CRITICAL_EMERGENCY'])
    .withMessage('Urgency must be NORMAL, URGENT, or CRITICAL_EMERGENCY')
];

/**
 * Validation for request status
 */
export const statusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['PENDING', 'APPROVED', 'PROCESSING', 'FULFILLED', 'CANCELLED', 'REJECTED', 'EXPIRED'])
    .withMessage('Invalid status')
];

/**
 * Validation for availability status
 */
export const availabilityValidation = [
  body('availabilityStatus')
    .notEmpty()
    .withMessage('Availability status is required')
    .isIn(['AVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'UNAVAILABLE'])
    .withMessage('Invalid availability status')
];

/**
 * Validation for verification status
 */
export const verificationValidation = [
  body('verificationStatus')
    .notEmpty()
    .withMessage('Verification status is required')
    .isIn(['PENDING', 'VERIFIED', 'REJECTED'])
    .withMessage('Invalid verification status')
];

/**
 * Validation for role
 */
export const roleValidation = [
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['DONOR', 'HOSPITAL', 'BLOOD_BANK', 'ADMIN'])
    .withMessage('Invalid role')
];

/**
 * Validation for date range
 */
export const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date')
    .toDate(),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date')
    .toDate()
    .custom((value, { req }) => {
      if (req.query.startDate && value < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

/**
 * Validation for units
 */
export const unitsValidation = [
  body('units')
    .notEmpty()
    .withMessage('Units is required')
    .isInt({ min: 1, max: 100 })
    .withMessage('Units must be between 1 and 100')
];

/**
 * Validation for amount (money)
 */
export const amountValidation = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number')
];

/**
 * Validation for percentage
 */
export const percentageValidation = [
  body('percentage')
    .notEmpty()
    .withMessage('Percentage is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Percentage must be between 0 and 100')
];

/**
 * Validation for URL
 */
export const urlValidation = [
  body('url')
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL')
];

/**
 * Validation for coordinates (latitude/longitude)
 */
export const coordinatesValidation = [
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
];

/**
 * Validation for file upload
 */
export const fileValidation = [
  body('file')
    .optional()
    .custom((value) => {
      // Check if file is present
      if (!value) return true;
      // Add custom file validation logic
      return true;
    })
];

/**
 * Sanitize HTML content
 */
export const sanitizeHTML = [
  body('content')
    .optional()
    .trim()
    .escape()
    .stripLow()
];

/**
 * Validate and sanitize string
 */
export const sanitizeString = [
  body('text')
    .optional()
    .trim()
    .escape()
    .stripLow()
];

/**
 * Combine validations
 * @param {...Array} validations - Multiple validation arrays
 * @returns {Array} Combined validation rules
 * 
 * @example
 * const validateUser = combineValidations(
 *   emailValidation,
 *   passwordValidation,
 *   phoneValidation
 * );
 */
export const combineValidations = (...validations) => {
  return validations.flat();
};

// Export all validations as a single object
export default {
  validate,
  idValidation,
  paginationValidation,
  searchValidation,
  emailValidation,
  passwordValidation,
  phoneValidation,
  ethiopianPhoneValidation,
  bloodTypeValidation,
  urgencyValidation,
  statusValidation,
  availabilityValidation,
  verificationValidation,
  roleValidation,
  dateRangeValidation,
  unitsValidation,
  amountValidation,
  percentageValidation,
  urlValidation,
  coordinatesValidation,
  fileValidation,
  sanitizeHTML,
  sanitizeString,
  combineValidations
};