import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getDashboardStats,
  getProfile,
  updateProfile,
  getRequests,
  createRequest,
  getRequestById,
  cancelRequest,
  getDonations,
  getStats
} from '../controllers/hospitalController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('HOSPITAL'));

/**
 * @route   GET /api/hospitals/dashboard
 * @desc    Get hospital dashboard statistics
 * @access  Private (Hospital)
 */
router.get('/dashboard', getDashboardStats);

/**
 * @route   GET /api/hospitals/profile
 * @desc    Get hospital profile
 * @access  Private (Hospital)
 */
router.get('/profile', getProfile);

/**
 * @route   PUT /api/hospitals/profile
 * @desc    Update hospital profile
 * @access  Private (Hospital)
 */
router.put('/profile', [
  body('hospitalName').optional().notEmpty().withMessage('Hospital name cannot be empty'),
  body('address').optional().notEmpty().withMessage('Address cannot be empty'),
  body('city').optional().notEmpty().withMessage('City cannot be empty'),
  //  FIX: Replace isMobilePhone with custom validation
  body('phone').optional().custom((value) => {
    if (!value) return true;
  
    const phoneRegex = /^(\+251|0)?[0-9]{9}$/;
    if (!phoneRegex.test(value)) {
      throw new Error('Phone must be a valid Ethiopian number (e.g., +251911111111 or 0911111111)');
    }
    return true;
  }),
  body('emergencyContact').optional().custom((value) => {
    if (!value) return true;
    const phoneRegex = /^(\+251|0)?[0-9]{9}$/;
    if (!phoneRegex.test(value)) {
      throw new Error('Emergency contact must be a valid Ethiopian number');
    }
    return true;
  })
], updateProfile);

/**
 * @route   GET /api/hospitals/requests
 * @desc    Get hospital blood requests
 * @access  Private (Hospital)
 */
router.get('/requests', getRequests);

/**
 * @route   POST /api/hospitals/requests
 * @desc    Create a blood request
 * @access  Private (Hospital)
 */
router.post('/requests', [
  body('bloodType').notEmpty().withMessage('Blood type is required'),
  body('unitsRequired').isInt({ min: 1 }).withMessage('Units required must be at least 1'),
  body('location').optional().notEmpty().withMessage('Location is required'),
  body('urgency').optional().isIn(['NORMAL', 'URGENT', 'CRITICAL_EMERGENCY']).withMessage('Invalid urgency level'),
  body('contactInformation').optional().notEmpty().withMessage('Contact information is required')
], createRequest);

/**
 * @route   GET /api/hospitals/requests/:id
 * @desc    Get a specific request
 * @access  Private (Hospital)
 */
router.get('/requests/:id', getRequestById);

/**
 * @route   PUT /api/hospitals/requests/:id/cancel
 * @desc    Cancel a blood request
 * @access  Private (Hospital)
 */
router.put('/requests/:id/cancel', [
  body('notes').optional().isString().withMessage('Notes must be a string')
], cancelRequest);

/**
 * @route   GET /api/hospitals/donations
 * @desc    Get hospital donations
 * @access  Private (Hospital)
 */
router.get('/donations', getDonations);

/**
 * @route   GET /api/hospitals/stats
 * @desc    Get hospital statistics
 * @access  Private (Hospital)
 */
router.get('/stats', getStats);

export default router;