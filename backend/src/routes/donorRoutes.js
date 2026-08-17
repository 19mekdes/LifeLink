import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getProfile,
  updateProfile,
  updateAvailability,
  getAvailableRequests,
  respondToRequest,
  getDonations,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getStats,
  getDashboard
} from '../controllers/donorController.js';

const router = express.Router();

// All donor routes require authentication and DONOR role
router.use(authenticate);
router.use(authorize('DONOR'));

// ============ DASHBOARD ============
router.get('/dashboard', getDashboard);

// ============ PROFILE ============
router.get('/profile', getProfile);
router.put('/profile', [
  body('name').optional().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('age').optional().isInt({ min: 16, max: 100 }).withMessage('Age must be between 16 and 100'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('bloodType').optional().isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
    .withMessage('Invalid blood type'),
  body('address').optional().isLength({ min: 5 }).withMessage('Address must be at least 5 characters'),
  body('city').optional().isLength({ min: 2 }).withMessage('City must be at least 2 characters')
], updateProfile);

// ============ AVAILABILITY ============
router.put('/availability', [
  body('availabilityStatus').isIn(['AVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'UNAVAILABLE'])
    .withMessage('Invalid availability status')
], updateAvailability);

// ============ REQUESTS ============
router.get('/requests', getAvailableRequests);
router.post('/requests/:id/respond', [
  body('response').isIn(['ACCEPTED', 'DECLINED', 'MAYBE']).withMessage('Invalid response'),
  body('message').optional().isString().withMessage('Message must be a string')
], respondToRequest);

// ============ DONATIONS ============
router.get('/donations', getDonations);

// ============ NOTIFICATIONS ============
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/read-all', markAllNotificationsRead);

// ============ STATISTICS ============
router.get('/stats', getStats);

export default router;