import express from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleAuth.js';
import {
  getAllInventory,
  getInventoryByBloodType,
  upsertInventory,
  updateInventoryUnits,
  deleteInventory,
  getLowStockItems,
  getExpiringItems,
  getInventoryStats,
  bulkUpdateInventory
} from '../controllers/inventoryController.js';

const router = express.Router();

// All inventory routes require authentication and BLOOD_BANK role
router.use(authenticate);
router.use(authorize('BLOOD_BANK'));

// ============ GET ALL INVENTORY ============
/**
 * @route   GET /api/inventory
 * @desc    Get all inventory items for the blood bank
 * @access  Private (Blood Bank)
 */
router.get('/', getAllInventory);

// ============ GET INVENTORY STATS ============
/**
 * @route   GET /api/inventory/stats
 * @desc    Get inventory statistics
 * @access  Private (Blood Bank)
 */
router.get('/stats', getInventoryStats);

// ============ GET LOW STOCK ITEMS ============
/**
 * @route   GET /api/inventory/low-stock
 * @desc    Get low stock inventory items
 * @access  Private (Blood Bank)
 */
router.get('/low-stock', getLowStockItems);

// ============ GET EXPIRING ITEMS ============
/**
 * @route   GET /api/inventory/expiring
 * @desc    Get expiring inventory items (within 30 days)
 * @access  Private (Blood Bank)
 */
router.get('/expiring', getExpiringItems);

// ============ GET INVENTORY BY BLOOD TYPE ============
/**
 * @route   GET /api/inventory/:bloodType
 * @desc    Get inventory item by blood type
 * @access  Private (Blood Bank)
 */
router.get(
  '/:bloodType',
  param('bloodType')
    .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
    .withMessage('Invalid blood type'),
  getInventoryByBloodType
);

// ============ CREATE OR UPDATE INVENTORY ============
/**
 * @route   POST /api/inventory
 * @desc    Create or update inventory item
 * @access  Private (Blood Bank)
 */
router.post(
  '/',
  [
    body('bloodType')
      .notEmpty()
      .withMessage('Blood type is required')
      .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
      .withMessage('Invalid blood type'),
    body('unitsAvailable')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Units must be a non-negative integer'),
    body('minStockLevel')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Min stock level must be a non-negative integer'),
    body('expiryDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid expiry date format')
  ],
  upsertInventory
);

// ============ UPDATE INVENTORY UNITS ============
/**
 * @route   PATCH /api/inventory/:bloodType
 * @desc    Update inventory units (add/subtract/set)
 * @access  Private (Blood Bank)
 */
router.patch(
  '/:bloodType',
  [
    param('bloodType')
      .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
      .withMessage('Invalid blood type'),
    body('unitsAvailable')
      .notEmpty()
      .withMessage('Units are required')
      .isInt({ min: 0 })
      .withMessage('Units must be a non-negative integer'),
    body('operation')
      .optional()
      .isIn(['set', 'add', 'subtract'])
      .withMessage('Operation must be set, add, or subtract')
  ],
  updateInventoryUnits
);

// ============ DELETE INVENTORY ============
/**
 * @route   DELETE /api/inventory/:bloodType
 * @desc    Delete inventory item
 * @access  Private (Blood Bank)
 */
router.delete(
  '/:bloodType',
  param('bloodType')
    .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
    .withMessage('Invalid blood type'),
  deleteInventory
);

// ============ BULK UPDATE INVENTORY ============
/**
 * @route   POST /api/inventory/bulk
 * @desc    Bulk update inventory items
 * @access  Private (Blood Bank)
 */
router.post(
  '/bulk',
  [
    body('items')
      .notEmpty()
      .withMessage('Items array is required')
      .isArray({ min: 1 })
      .withMessage('Items must be a non-empty array'),
    body('items.*.bloodType')
      .notEmpty()
      .withMessage('Blood type is required for each item')
      .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
      .withMessage('Invalid blood type'),
    body('items.*.unitsAvailable')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Units must be a non-negative integer'),
    body('items.*.minStockLevel')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Min stock level must be a non-negative integer'),
    body('items.*.expiryDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid expiry date format')
  ],
  bulkUpdateInventory
);

export default router;