import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleAuth.js';
import {
  getDashboard,
  getInventory,
  updateInventory,
  getRequests,
  approveRequest,
   deleteInventoryItem,
  rejectRequest,
  recordDonation
} from '../controllers/bloodBankController.js';

const router = express.Router();

// All routes require authentication and BLOOD_BANK role
router.use(authenticate);
router.use(authorize('BLOOD_BANK'));

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
 * @desc    Get inventory
 * @access  Private (Blood Bank)
 */
router.get('/inventory', getInventory);

/**
 * @route   PUT /api/blood-banks/inventory
 * @desc    Update inventory
 * @access  Private (Blood Bank)
 */
router.put('/inventory', [
  body('bloodType').notEmpty().withMessage('Blood type is required'),
  body('unitsAvailable').optional().isInt({ min: 0 }).withMessage('Units must be a positive number'),
  body('minStockLevel').optional().isInt({ min: 0 }).withMessage('Min stock level must be a positive number')
], updateInventory);

// ============ REQUESTS ============
/**
 * @route   GET /api/blood-banks/requests
 * @desc    Get blood requests
 * @access  Private (Blood Bank)
 */
router.get('/requests', getRequests);

/**
 * @route   PUT /api/blood-banks/requests/:id/approve
 * @desc    Approve a blood request
 * @access  Private (Blood Bank)
 */
router.put('/requests/:id/approve', [
  body('notes').optional().isString().withMessage('Notes must be a string')
], approveRequest);

/**
 * @route   PUT /api/blood-banks/requests/:id/reject
 * @desc    Reject a blood request
 * @access  Private (Blood Bank)
 */
router.put('/requests/:id/reject', [
  body('reason').optional().isString().withMessage('Reason must be a string')
], rejectRequest);
/**
 * @route   DELETE /api/blood-banks/inventory/:bloodType
 * @desc    Delete an inventory item
 * @access  Private (Blood Bank)
 */
router.delete('/inventory/:bloodType', deleteInventoryItem);
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