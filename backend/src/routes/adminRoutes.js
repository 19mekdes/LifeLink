// backend/src/routes/adminRoutes.js

import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { authorize, isSuperAdmin } from '../middleware/roleAuth.js';
import {
  getDashboardStats,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getHospitals,
  verifyHospital,
  getBloodBanks,
  verifyBloodBank,
  getDonors,
  verifyDonor,
  getAuditLogs,
  getSystemStats,
  createAdmin,
  exportData
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// ============ DASHBOARD ============
router.get('/dashboard', getDashboardStats);

// ============ USERS ============
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// ============ ADMINS (Super Admin only) ============
router.post('/admins', isSuperAdmin, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('role').isIn(['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DONOR_ADMIN', 'ADMIN'])
    .withMessage('Invalid role')
], createAdmin);

// ============ HOSPITALS ============
router.get('/hospitals', getHospitals);
router.put('/hospitals/:id/verify', [
  body('status').isIn(['VERIFIED', 'REJECTED']).withMessage('Invalid status')
], verifyHospital);

// ============ BLOOD BANKS ============
router.get('/blood-banks', getBloodBanks);
router.put('/blood-banks/:id/verify', [
  body('status').isIn(['VERIFIED', 'REJECTED']).withMessage('Invalid status')
], verifyBloodBank);

// ============ DONORS ============
router.get('/donors', getDonors);
router.put('/donors/:id/verify', verifyDonor);

// ============ SYSTEM ============
router.get('/audit-logs', getAuditLogs);
router.get('/stats', getSystemStats);
router.get('/export', exportData);

export default router;