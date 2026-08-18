// backend/src/routes/notificationRoutes.js

import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleAuth.js';
import {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  markAsUnread,
  deleteNotification,
  deleteReadNotifications,
  createNotification,
  getNotificationStats,
  getUnreadCount,
  bulkDeleteNotifications,
  sendSystemNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

// ============ GET NOTIFICATIONS ============
/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for the current user
 * @access  Private (All authenticated users)
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('isRead').optional().isBoolean().withMessage('isRead must be true or false'),
    query('type').optional().isString().withMessage('Type must be a string')
  ],
  getNotifications
);

// ============ GET UNREAD COUNT ============
/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private (All authenticated users)
 */
router.get('/unread-count', getUnreadCount);

// ============ GET NOTIFICATION STATS ============
/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Private (All authenticated users)
 */
router.get('/stats', getNotificationStats);

// ============ GET NOTIFICATION BY ID ============
/**
 * @route   GET /api/notifications/:id
 * @desc    Get notification by ID
 * @access  Private (All authenticated users)
 */
router.get(
  '/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('Notification ID is required')
      .isString()
      .withMessage('Invalid notification ID')
  ],
  getNotificationById
);

// ============ MARK AS READ ============
/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private (All authenticated users)
 */
router.put(
  '/:id/read',
  [
    param('id')
      .notEmpty()
      .withMessage('Notification ID is required')
      .isString()
      .withMessage('Invalid notification ID')
  ],
  markAsRead
);

// ============ MARK AS UNREAD ============
/**
 * @route   PUT /api/notifications/:id/unread
 * @desc    Mark a notification as unread
 * @access  Private (All authenticated users)
 */
router.put(
  '/:id/unread',
  [
    param('id')
      .notEmpty()
      .withMessage('Notification ID is required')
      .isString()
      .withMessage('Invalid notification ID')
  ],
  markAsUnread
);

// ============ MARK ALL AS READ ============
/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private (All authenticated users)
 */
router.put('/read-all', markAllAsRead);

// ============ DELETE NOTIFICATION ============
/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private (All authenticated users)
 */
router.delete(
  '/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('Notification ID is required')
      .isString()
      .withMessage('Invalid notification ID')
  ],
  deleteNotification
);

// ============ DELETE ALL READ NOTIFICATIONS ============
/**
 * @route   DELETE /api/notifications/read
 * @desc    Delete all read notifications
 * @access  Private (All authenticated users)
 */
router.delete('/read', deleteReadNotifications);

// ============ BULK DELETE NOTIFICATIONS ============
/**
 * @route   DELETE /api/notifications/bulk
 * @desc    Bulk delete notifications by IDs
 * @access  Private (All authenticated users)
 */
router.delete(
  '/bulk',
  [
    body('ids')
      .notEmpty()
      .withMessage('Notification IDs array is required')
      .isArray({ min: 1 })
      .withMessage('IDs must be a non-empty array')
  ],
  bulkDeleteNotifications
);

// ============ CREATE NOTIFICATION ============
/**
 * @route   POST /api/notifications
 * @desc    Create a new notification (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/',
  authorize('ADMIN', 'SUPER_ADMIN'),
  [
    body('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .isString()
      .withMessage('Invalid user ID'),
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .isString()
      .withMessage('Title must be a string')
      .isLength({ max: 255 })
      .withMessage('Title cannot exceed 255 characters')
      .trim(),
    body('message')
      .notEmpty()
      .withMessage('Message is required')
      .isString()
      .withMessage('Message must be a string')
      .isLength({ max: 1000 })
      .withMessage('Message cannot exceed 1000 characters')
      .trim(),
    body('type')
      .optional()
      .isIn(['EMERGENCY', 'REMINDER', 'STATUS_UPDATE', 'GENERAL', 'SYSTEM'])
      .withMessage('Invalid notification type'),
    body('requestId')
      .optional()
      .isString()
      .withMessage('Invalid request ID'),
    body('data')
      .optional()
      .isObject()
      .withMessage('Data must be an object')
  ],
  createNotification
);

// ============ SEND SYSTEM NOTIFICATION ============
/**
 * @route   POST /api/notifications/system
 * @desc    Send a system-wide notification (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/system',
  authorize('ADMIN', 'SUPER_ADMIN'),
  [
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .isString()
      .withMessage('Title must be a string')
      .isLength({ max: 255 })
      .withMessage('Title cannot exceed 255 characters')
      .trim(),
    body('message')
      .notEmpty()
      .withMessage('Message is required')
      .isString()
      .withMessage('Message must be a string')
      .isLength({ max: 1000 })
      .withMessage('Message cannot exceed 1000 characters')
      .trim(),
    body('type')
      .optional()
      .isIn(['EMERGENCY', 'REMINDER', 'STATUS_UPDATE', 'GENERAL', 'SYSTEM'])
      .withMessage('Invalid notification type'),
    body('roles')
      .optional()
      .isArray()
      .withMessage('Roles must be an array'),
    body('data')
      .optional()
      .isObject()
      .withMessage('Data must be an object')
  ],
  sendSystemNotification
);

export default router;