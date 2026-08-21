// backend/src/user/hospital/hospitalRoutes.js

import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.js';
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
} from './hospitalController.js';

const router = express.Router();

// All hospital routes require authentication and HOSPITAL role
router.use(authenticate);
router.use(authorize('HOSPITAL'));

router.get('/dashboard', getDashboardStats);
router.get('/profile', getProfile);
router.put('/profile', [
  body('hospitalName').optional().notEmpty().withMessage('Hospital name cannot be empty'),
  body('address').optional().notEmpty().withMessage('Address cannot be empty'),
  body('city').optional().notEmpty().withMessage('City cannot be empty'),
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

router.get('/requests', getRequests);
router.post('/requests', [
  body('bloodType').notEmpty().withMessage('Blood type is required'),
  body('unitsRequired').isInt({ min: 1 }).withMessage('Units required must be at least 1'),
  body('location').optional().notEmpty().withMessage('Location is required'),
  body('urgency').optional().isIn(['NORMAL', 'URGENT', 'CRITICAL_EMERGENCY']).withMessage('Invalid urgency level'),
  body('contactInformation').optional().notEmpty().withMessage('Contact information is required')
], createRequest);

router.get('/requests/:id', getRequestById);
router.put('/requests/:id/cancel', [
  body('notes').optional().isString().withMessage('Notes must be a string')
], cancelRequest);

router.get('/donations', getDonations);
router.get('/stats', getStats);

export default router;
