import express from 'express';
import { param, query, body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { authorize, isSuperAdmin } from '../middleware/roleAuth.js';
import {
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
  getUserActivityTimeline,
  exportAuditLogs,
  cleanupAuditLogs,
  getAuditActions,
  getAuditEntities
} from '../controllers/auditController.js';

const router = express.Router();

// All audit routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// ============ GET AUDIT LOGS ============
/**
 * @route   GET /api/audit/logs
 * @desc    Get all audit logs with filters
 * @access  Private (Admin)
 */
router.get(
  '/logs',
  [
    query('userId').optional().isString().withMessage('Invalid user ID'),
    query('action').optional().isString().withMessage('Invalid action'),
    query('entity').optional().isString().withMessage('Invalid entity'),
    query('entityId').optional().isString().withMessage('Invalid entity ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  getAuditLogs
);

// ============ GET AUDIT LOG BY ID ============
/**
 * @route   GET /api/audit/logs/:id
 * @desc    Get audit log by ID
 * @access  Private (Admin)
 */
router.get(
  '/logs/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('Audit log ID is required')
      .isString()
      .withMessage('Invalid audit log ID')
  ],
  getAuditLogById
);

// ============ GET AUDIT STATISTICS ============
/**
 * @route   GET /api/audit/stats
 * @desc    Get audit statistics
 * @access  Private (Admin)
 */
router.get(
  '/stats',
  [
    query('userId').optional().isString().withMessage('Invalid user ID'),
    query('entity').optional().isString().withMessage('Invalid entity'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date')
  ],
  getAuditStats
);

// ============ GET USER ACTIVITY TIMELINE ============
/**
 * @route   GET /api/audit/users/:userId/timeline
 * @desc    Get user activity timeline
 * @access  Private (Admin)
 */
router.get(
  '/users/:userId/timeline',
  [
    param('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isString()
      .withMessage('Invalid user ID'),
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
  ],
  getUserActivityTimeline
);

// ============ EXPORT AUDIT LOGS ============
/**
 * @route   GET /api/audit/export
 * @desc    Export audit logs
 * @access  Private (Admin)
 */
router.get(
  '/export',
  [
    query('userId').optional().isString().withMessage('Invalid user ID'),
    query('action').optional().isString().withMessage('Invalid action'),
    query('entity').optional().isString().withMessage('Invalid entity'),
    query('entityId').optional().isString().withMessage('Invalid entity ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
    query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv')
  ],
  exportAuditLogs
);

// ============ CLEANUP OLD LOGS ============
/**
 * @route   DELETE /api/audit/cleanup
 * @desc    Clean up old audit logs (Super Admin only)
 * @access  Private (Super Admin)
 */
router.delete(
  '/cleanup',
  isSuperAdmin,
  [
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
  ],
  cleanupAuditLogs
);

// ============ GET AUDIT ACTIONS ============
/**
 * @route   GET /api/audit/actions
 * @desc    Get list of audit actions
 * @access  Private (Admin)
 */
router.get('/actions', getAuditActions);

// ============ GET AUDIT ENTITIES ============
/**
 * @route   GET /api/audit/entities
 * @desc    Get list of audit entities
 * @access  Private (Admin)
 */
router.get('/entities', getAuditEntities);

export default router;