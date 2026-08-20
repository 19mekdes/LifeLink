// backend/src/routes/adminRoutes.js

import express from 'express';
import { body } from 'express-validator';
import {
  getDashboard,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  createAdmin,
  getHospitals,
  verifyHospital,
  getBloodBanks,
  verifyBloodBank,
  getDonors,
  verifyDonor,
  getAuditLogs,
  getStats,
  getSummaryStats,
  exportData,
  getBloodInventoryStats,
  getSignupsStats,
  getRequestTypesStats,
  getFulfillmentStats,
  getGeographicStats,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleAuth.js';
import { validate } from '../middleware/validation.js';
import {
  updateUserValidation,
  createAdminValidation,
  verifyHospitalValidation,
  verifyBloodBankValidation,
  verifyDonorValidation,
  exportValidation
} from '../validators/adminValidator.js';

const router = express.Router();

// Apply authentication and Admin role check on all admin routes
router.use(authenticate, isAdmin);

// 1. GET /api/admin/dashboard
router.get('/dashboard', getDashboard);

// 2. GET /api/admin/users
router.get('/users', getUsers);

// 3. GET /api/admin/users/:id
router.get('/users/:id', getUserById);

// 4. PUT /api/admin/users/:id
router.put('/users/:id', updateUserValidation, validate, updateUser);

// 5. DELETE /api/admin/users/:id
router.delete('/users/:id', deleteUser);

// 6. POST /api/admin/admins
router.post('/admins', createAdminValidation, validate, createAdmin);

// 7. GET /api/admin/hospitals
router.get('/hospitals', getHospitals);

// 8. PUT /api/admin/hospitals/:id/verify
router.put('/hospitals/:id/verify', verifyHospitalValidation, validate, verifyHospital);

// 9. GET /api/admin/blood-banks
router.get('/blood-banks', getBloodBanks);

// 10. PUT /api/admin/blood-banks/:id/verify
router.put('/blood-banks/:id/verify', verifyBloodBankValidation, validate, verifyBloodBank);

// 11. GET /api/admin/donors
router.get('/donors', getDonors);

// 12. PUT /api/admin/donors/:id/verify
router.put('/donors/:id/verify', verifyDonorValidation, validate, verifyDonor);

// 13. GET /api/admin/audit-logs
router.get('/audit-logs', getAuditLogs);

// 14. GET /api/admin/stats
router.get('/stats', getStats);
router.get('/stats/summary', getSummaryStats);
router.get('/stats/blood-inventory', getBloodInventoryStats);
router.get('/stats/signups', getSignupsStats);
router.get('/stats/request-types', getRequestTypesStats);
router.get('/stats/fulfillment', getFulfillmentStats);
router.get('/stats/geographic', getGeographicStats);

// 15. GET /api/admin/export
router.get('/export', exportValidation, validate, exportData);

// 16. Admin Profile & Password Management
router.get('/profile', getAdminProfile);
router.put('/profile', [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim()
], validate, updateAdminProfile);

router.put('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], validate, changeAdminPassword);

// 17. Admin Notifications
router.get('/notifications', getAdminNotifications);
router.put('/notifications/:id/read', markAdminNotificationRead);
router.put('/notifications/read-all', markAllAdminNotificationsRead);

export default router;
