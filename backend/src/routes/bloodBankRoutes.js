import express from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleAuth.js';
import {
  getDashboard,
  getInventory,
  updateInventory,
  deleteInventoryItem,
  getRequests,
  approveRequest,
  rejectRequest,
  recordDonation,
  getProfile,
  updateProfile,
  getStats
} from '../controllers/bloodBankController.js';

const router = express.Router();

// All routes require authentication and BLOOD_BANK role
router.use(authenticate);
router.use(authorize('BLOOD_BANK'));

// ============ PROFILE ============
/**
 * @route   GET /api/blood-banks/profile
 * @desc    Get blood bank profile
 * @access  Private (Blood Bank)
 */
router.get('/profile', getProfile);

/**
 * @route   PUT /api/blood-banks/profile
 * @desc    Update blood bank profile
 * @access  Private (Blood Bank)
 */
router.put('/profile', [
  body('bankName').optional().isLength({ min: 2 }).withMessage('Bank name must be at least 2 characters'),
  body('address').optional().isLength({ min: 5 }).withMessage('Address must be at least 5 characters'),
  body('city').optional().isLength({ min: 2 }).withMessage('City must be at least 2 characters'),
  body('phone').optional().isString().withMessage('Phone must be a string'),
  body('emergencyContact').optional().isString().withMessage('Emergency contact must be a string')
], updateProfile);

// ============ STATISTICS ============
/**
 * @route   GET /api/blood-banks/stats
 * @desc    Get blood bank statistics
 * @access  Private (Blood Bank)
 */
router.get('/stats', getStats);

// ============ DASHBOARD ============
/**
 * @route   GET /api/blood-banks/dashboard
 * @desc    Get blood bank dashboard
 * @access  Private (Blood Bank)
 */
router.get('/dashboard', getDashboard);

// ============ INVENTORY ============
/**
 * @route   GET /api/blood-banks/inventory
 * @desc    Get all inventory items
 * @access  Private (Blood Bank)
 */
router.get('/inventory', getInventory);

/**
 * @route   PUT /api/blood-banks/inventory
 * @desc    Create or update inventory item
 * @access  Private (Blood Bank)
 */
router.put('/inventory', [
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
    .withMessage('Min stock level must be a non-negative integer')
], updateInventory);

/**
 * @route   DELETE /api/blood-banks/inventory/:bloodType
 * @desc    Delete an inventory item
 * @access  Private (Blood Bank)
 */
router.delete(
  '/inventory/:bloodType',
  [
    param('bloodType')
      .notEmpty()
      .withMessage('Blood type is required')
      .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
      .withMessage('Invalid blood type')
  ],
  deleteInventoryItem
);

// ============ REQUESTS ============
/**
 * @route   GET /api/blood-banks/requests
 * @desc    Get all blood requests
 * @access  Private (Blood Bank)
 */
router.get('/requests', getRequests);

/**
 * @route   PUT /api/blood-banks/requests/:id/approve
 * @desc    Approve a blood request
 * @access  Private (Blood Bank)
 */
router.put('/requests/:id/approve', [
  param('id')
    .notEmpty()
    .withMessage('Request ID is required'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], approveRequest);

/**
 * @route   PUT /api/blood-banks/requests/:id/reject
 * @desc    Reject a blood request
 * @access  Private (Blood Bank)
 */
router.put('/requests/:id/reject', [
  param('id')
    .notEmpty()
    .withMessage('Request ID is required'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], rejectRequest);

// ============ DONATIONS ============
/**
 * @route   POST /api/blood-banks/donations
 * @desc    Record a donation
 * @access  Private (Blood Bank)
 */
router.post('/donations', [
  body('donorId').notEmpty().withMessage('Donor ID is required'),
  body('requestId').notEmpty().withMessage('Request ID is required'),
  body('units').isInt({ min: 1 }).withMessage('Units must be at least 1'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('donationDate').optional().isISO8601().withMessage('Invalid date format')
], recordDonation);

export default router;