import { body, param, query } from 'express-validator';

/**
 * Validation rules for creating a blood request
 */
export const createBloodRequestValidation = [
  body('bloodType')
    .notEmpty()
    .withMessage('Blood type is required')
    .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
    .withMessage('Invalid blood type. Must be one of: A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG, O_POS, O_NEG'),

  body('unitsRequired')
    .notEmpty()
    .withMessage('Units required is required')
    .isInt({ min: 1, max: 100 })
    .withMessage('Units required must be between 1 and 100'),

  body('location')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('Location must be between 2 and 255 characters')
    .trim(),

  body('urgency')
    .optional()
    .isIn(['NORMAL', 'URGENT', 'CRITICAL_EMERGENCY'])
    .withMessage('Urgency must be NORMAL, URGENT, or CRITICAL_EMERGENCY'),

  body('contactInformation')
    .optional()
    .isLength({ min: 5, max: 255 })
    .withMessage('Contact information must be between 5 and 255 characters')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
    .trim(),

  body('patientInfo')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Patient information cannot exceed 500 characters')
    .trim(),

  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
    .trim(),
];

/**
 * Validation rules for updating a blood request
 */
export const updateBloodRequestValidation = [
  body('bloodType')
    .optional()
    .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
    .withMessage('Invalid blood type'),

  body('unitsRequired')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Units required must be between 1 and 100'),

  body('location')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('Location must be between 2 and 255 characters')
    .trim(),

  body('urgency')
    .optional()
    .isIn(['NORMAL', 'URGENT', 'CRITICAL_EMERGENCY'])
    .withMessage('Urgency must be NORMAL, URGENT, or CRITICAL_EMERGENCY'),

  body('contactInformation')
    .optional()
    .isLength({ min: 5, max: 255 })
    .withMessage('Contact information must be between 5 and 255 characters')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
    .trim(),

  body('patientInfo')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Patient information cannot exceed 500 characters')
    .trim(),
];

/**
 * Validation rules for updating request status
 */
export const updateRequestStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['PENDING', 'APPROVED', 'PROCESSING', 'FULFILLED', 'CANCELLED', 'REJECTED', 'EXPIRED'])
    .withMessage('Invalid status'),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .trim(),
];

/**
 * Validation rules for canceling a request
 */
export const cancelRequestValidation = [
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .trim(),
];

/**
 * Validation rules for donor response to request
 */
export const donorResponseValidation = [
  body('response')
    .notEmpty()
    .withMessage('Response is required')
    .isIn(['ACCEPTED', 'DECLINED', 'MAYBE'])
    .withMessage('Response must be ACCEPTED, DECLINED, or MAYBE'),

  body('message')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters')
    .trim(),
];

/**
 * Validation rules for request ID parameter
 */
export const requestIdParamValidation = [
  param('id')
    .notEmpty()
    .withMessage('Request ID is required')
    .isString()
    .withMessage('Invalid request ID format')
    .isLength({ min: 10 })
    .withMessage('Invalid request ID'),
];

/**
 * Validation rules for filtering requests
 */
export const filterRequestsValidation = [
  query('status')
    .optional()
    .isIn(['PENDING', 'APPROVED', 'PROCESSING', 'FULFILLED', 'CANCELLED', 'REJECTED', 'EXPIRED'])
    .withMessage('Invalid status filter'),

  query('urgency')
    .optional()
    .isIn(['NORMAL', 'URGENT', 'CRITICAL_EMERGENCY'])
    .withMessage('Invalid urgency filter'),

  query('bloodType')
    .optional()
    .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
    .withMessage('Invalid blood type filter'),

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
    .isIn(['createdAt', 'updatedAt', 'urgency', 'bloodType'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

/**
 * Validation rules for request allocation
 */
export const allocateRequestValidation = [
  body('inventoryId')
    .notEmpty()
    .withMessage('Inventory ID is required')
    .isString()
    .withMessage('Invalid inventory ID'),

  body('unitsAllocated')
    .notEmpty()
    .withMessage('Units allocated is required')
    .isInt({ min: 1 })
    .withMessage('Units allocated must be at least 1'),
];

/**
 * Validation rules for emergency request
 */
export const emergencyRequestValidation = [
  body('bloodType')
    .notEmpty()
    .withMessage('Blood type is required for emergency request')
    .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
    .withMessage('Invalid blood type'),

  body('unitsRequired')
    .notEmpty()
    .withMessage('Units required is required')
    .isInt({ min: 1, max: 50 })
    .withMessage('Units required must be between 1 and 50'),

  body('location')
    .notEmpty()
    .withMessage('Location is required for emergency request')
    .isLength({ min: 2, max: 255 })
    .withMessage('Location must be between 2 and 255 characters')
    .trim(),

  body('contactInformation')
    .notEmpty()
    .withMessage('Contact information is required for emergency request')
    .isLength({ min: 5, max: 255 })
    .withMessage('Contact information must be between 5 and 255 characters')
    .trim(),
];

// Export all validations as a single object
export default {
  createBloodRequestValidation,
  updateBloodRequestValidation,
  updateRequestStatusValidation,
  cancelRequestValidation,
  donorResponseValidation,
  requestIdParamValidation,
  filterRequestsValidation,
  allocateRequestValidation,
  emergencyRequestValidation,
};