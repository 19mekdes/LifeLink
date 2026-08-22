import { body } from 'express-validator';

export const updateProfileValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),

  body('age')
    .optional()
    .isInt({ min: 16, max: 100 })
    .withMessage('Age must be between 16 and 100'),

  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),

  body('bloodType')
    .optional()
    .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
    .withMessage('Invalid blood type'),

  body('address')
    .optional()
    .isLength({ min: 5, max: 255 })
    .withMessage('Address must be between 5 and 255 characters')
    .trim(),

  body('city')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters')
    .trim(),

  body('state')
    .optional()
    .isLength({ max: 50 })
    .withMessage('State cannot exceed 50 characters')
    .trim(),

  body('country')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Country must be between 2 and 50 characters')
    .trim()
];

/**
 * Validation rules for availability update
 */
export const updateAvailabilityValidation = [
  body('availabilityStatus')
    .notEmpty()
    .withMessage('Availability status is required')
    .isIn(['AVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'UNAVAILABLE'])
    .withMessage('Invalid availability status')
];

/**
 * Validation rules for donor response
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
    .trim()
];

export default {
  updateProfileValidation,
  updateAvailabilityValidation,
  donorResponseValidation
};