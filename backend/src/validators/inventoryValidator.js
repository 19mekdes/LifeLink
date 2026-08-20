// backend/src/validators/inventoryValidator.js

import { body, param, query } from 'express-validator';

// ============ BLOOD TYPE VALIDATION ============
const BLOOD_TYPES = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'];

const INVENTORY_STATUSES = ['AVAILABLE', 'LOW', 'OUT_OF_STOCK', 'EXPIRED'];

/**
 * Validation for blood type parameter
 */
export const bloodTypeParamValidation = [
  param('bloodType')
    .notEmpty()
    .withMessage('Blood type is required')
    .isIn(BLOOD_TYPES)
    .withMessage(`Invalid blood type. Must be one of: ${BLOOD_TYPES.join(', ')}`)
];

/**
 * Validation for creating/updating inventory
 */
export const upsertInventoryValidation = [
  body('bloodType')
    .notEmpty()
    .withMessage('Blood type is required')
    .isIn(BLOOD_TYPES)
    .withMessage(`Invalid blood type. Must be one of: ${BLOOD_TYPES.join(', ')}`),

  body('unitsAvailable')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Units available must be a non-negative integer')
    .toInt(),

  body('minStockLevel')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Min stock level must be a non-negative integer')
    .toInt(),

  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format. Use ISO 8601 format (YYYY-MM-DD)')
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          throw new Error('Expiry date cannot be in the past');
        }
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn(INVENTORY_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${INVENTORY_STATUSES.join(', ')}`)
];

/**
 * Validation for updating inventory units
 */
export const updateInventoryUnitsValidation = [
  param('bloodType')
    .notEmpty()
    .withMessage('Blood type is required')
    .isIn(BLOOD_TYPES)
    .withMessage(`Invalid blood type. Must be one of: ${BLOOD_TYPES.join(', ')}`),

  body('unitsAvailable')
    .notEmpty()
    .withMessage('Units are required')
    .isInt({ min: 0 })
    .withMessage('Units must be a non-negative integer')
    .toInt(),

  body('operation')
    .optional()
    .isIn(['set', 'add', 'subtract'])
    .withMessage('Operation must be set, add, or subtract')
];

/**
 * Validation for bulk update inventory
 */
export const bulkUpdateInventoryValidation = [
  body('items')
    .notEmpty()
    .withMessage('Items array is required')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),

  body('items.*.bloodType')
    .notEmpty()
    .withMessage('Blood type is required for each item')
    .isIn(BLOOD_TYPES)
    .withMessage(`Invalid blood type. Must be one of: ${BLOOD_TYPES.join(', ')}`),

  body('items.*.unitsAvailable')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Units available must be a non-negative integer')
    .toInt(),

  body('items.*.minStockLevel')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Min stock level must be a non-negative integer')
    .toInt(),

  body('items.*.expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format. Use ISO 8601 format (YYYY-MM-DD)')
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          throw new Error('Expiry date cannot be in the past');
        }
      }
      return true;
    }),

  body('items.*.status')
    .optional()
    .isIn(INVENTORY_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${INVENTORY_STATUSES.join(', ')}`)
];

/**
 * Validation for get inventory filters
 */
export const getInventoryFiltersValidation = [
  query('bloodType')
    .optional()
    .isIn(BLOOD_TYPES)
    .withMessage(`Invalid blood type. Must be one of: ${BLOOD_TYPES.join(', ')}`),

  query('status')
    .optional()
    .isIn(INVENTORY_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${INVENTORY_STATUSES.join(', ')}`),

  query('lowStock')
    .optional()
    .isBoolean()
    .withMessage('lowStock must be true or false')
    .toBoolean(),

  query('expiring')
    .optional()
    .isBoolean()
    .withMessage('expiring must be true or false')
    .toBoolean(),

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
    .isIn(['bloodType', 'unitsAvailable', 'expiryDate', 'createdAt'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * Validation for transfer inventory
 */
export const transferInventoryValidation = [
  body('fromBloodBankId')
    .notEmpty()
    .withMessage('Source blood bank ID is required')
    .isString()
    .withMessage('Invalid source blood bank ID'),

  body('toBloodBankId')
    .notEmpty()
    .withMessage('Destination blood bank ID is required')
    .isString()
    .withMessage('Invalid destination blood bank ID'),

  body('bloodType')
    .notEmpty()
    .withMessage('Blood type is required')
    .isIn(BLOOD_TYPES)
    .withMessage(`Invalid blood type. Must be one of: ${BLOOD_TYPES.join(', ')}`),

  body('units')
    .notEmpty()
    .withMessage('Units are required')
    .isInt({ min: 1 })
    .withMessage('Units must be at least 1')
    .toInt(),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .trim()
];

// ============ COMBINED VALIDATIONS ============

/**
 * Validation for creating inventory
 */
export const createInventoryValidation = [
  ...upsertInventoryValidation
];

/**
 * Validation for updating inventory
 */
export const updateInventoryValidation = [
  ...bloodTypeParamValidation,
  body('unitsAvailable')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Units available must be a non-negative integer')
    .toInt(),

  body('minStockLevel')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Min stock level must be a non-negative integer')
    .toInt(),

  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format. Use ISO 8601 format (YYYY-MM-DD)')
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          throw new Error('Expiry date cannot be in the past');
        }
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn(INVENTORY_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${INVENTORY_STATUSES.join(', ')}`)
];

/**
 * Validation for inventory ID parameter
 */
export const inventoryIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Inventory ID is required')
    .isString()
    .withMessage('Invalid inventory ID format')
    .isLength({ min: 10 })
    .withMessage('Invalid inventory ID')
];

// ============ EXPORT ALL ============

export default {
  bloodTypeParamValidation,
  upsertInventoryValidation,
  updateInventoryUnitsValidation,
  bulkUpdateInventoryValidation,
  getInventoryFiltersValidation,
  transferInventoryValidation,
  createInventoryValidation,
  updateInventoryValidation,
  inventoryIdValidation,
  BLOOD_TYPES,
  INVENTORY_STATUSES
};