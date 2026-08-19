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
router.get('/dashboard', getDashboard);

// ============ INVENTORY ============
router.get('/inventory', getInventory);
router.put('/inventory', updateInventory);

// ============ REQUESTS ============
router.get('/requests', getRequests);
router.put('/requests/:id/approve', approveRequest);
router.put('/requests/:id/reject', rejectRequest);

// ============ DONATIONS ============
router.post('/donations', recordDonation);

export default router;