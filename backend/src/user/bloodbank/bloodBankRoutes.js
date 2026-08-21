// backend/src/user/bloodbank/bloodBankRoutes.js

import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.js';
import {
  getDashboardStats,
  getProfile,
  updateProfile,
  getInventory
} from './bloodBankController.js';

const router = express.Router();

// All blood bank routes require authentication and BLOOD_BANK role
router.use(authenticate);
router.use(authorize('BLOOD_BANK'));

router.get('/dashboard', getDashboardStats);
router.get('/profile', getProfile);
router.put('/profile', [
  body('bankName').optional().notEmpty().withMessage('Bank name cannot be empty'),
  body('address').optional().notEmpty().withMessage('Address cannot be empty'),
  body('city').optional().notEmpty().withMessage('City cannot be empty')
], updateProfile);
router.get('/inventory', getInventory);

export default router;
