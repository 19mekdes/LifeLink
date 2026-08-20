import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleAuth.js';
import {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  cancelRequest,
  respondToRequest,
  getDonations,
  getStats
} from '../controllers/bloodRequestController.js';

const router = express.Router();


router.use(authenticate);

router.get(
  '/',
  [
    query('status')
      .optional()
      .isIn(['PENDING', 'APPROVED', 'PROCESSING', 'FULFILLED', 'CANCELLED', 'REJECTED', 'EXPIRED'])
      .withMessage('Invalid status filter'),
    query('urgency')
      .optional()
      .isIn(['NORMAL', 'URGENT', 'CRITICAL_EMERGENCY'])
      .withMessage('Invalid urgency filter'),
    query('bloodType')
      .optional()
      .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
      .withMessage('Invalid blood type filter'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('hospitalId')
      .optional()
      .isString()
      .withMessage('Invalid hospital ID')
  ],
  getRequests
);


router.post(
  '/',
  authorize('HOSPITAL'),
  [
    body('bloodType')
      .notEmpty()
      .withMessage('Blood type is required')
      .isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
      .withMessage('Invalid blood type'),
    body('unitsRequired')
      .notEmpty()
      .withMessage('Units required is required')
      .isInt({ min: 1, max: 100 })
      .withMessage('Units required must be between 1 and 100'),
    body('location')
      .optional()
      .isLength({ min: 2, max: 255 })
      .withMessage('Location must be between 2 and 255 characters')
      .trim(),
    body('urgency')
      .optional()
      .isIn(['NORMAL', 'URGENT', 'CRITICAL_EMERGENCY'])
      .withMessage('Urgency must be NORMAL, URGENT, or CRITICAL_EMERGENCY'),
    body('contactInformation')
      .optional()
      .isLength({ min: 5, max: 255 })
      .withMessage('Contact information must be between 5 and 255 characters')
      .trim(),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters')
      .trim(),
    body('patientInfo')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Patient information cannot exceed 500 characters')
      .trim()
  ],
  createRequest
);


router.get(
  '/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('Request ID is required')
      .isString()
      .withMessage('Invalid request ID')
      .isLength({ min: 10 })
      .withMessage('Invalid request ID')
  ],
  getRequestById
);


router.put(
  '/:id/status',
  authorize('BLOOD_BANK', 'ADMIN'),
  [
    param('id')
      .notEmpty()
      .withMessage('Request ID is required')
      .isString()
      .withMessage('Invalid request ID'),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['PENDING', 'APPROVED', 'PROCESSING', 'FULFILLED', 'CANCELLED', 'REJECTED', 'EXPIRED'])
      .withMessage('Invalid status'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
      .trim()
  ],
  updateRequestStatus
);

router.put(
  '/:id/cancel',
  authorize('HOSPITAL', 'ADMIN'),
  [
    param('id')
      .notEmpty()
      .withMessage('Request ID is required')
      .isString()
      .withMessage('Invalid request ID'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
      .trim()
  ],
  cancelRequest
);

router.post(
  '/:id/respond',
  authorize('DONOR'),
  [
    param('id')
      .notEmpty()
      .withMessage('Request ID is required')
      .isString()
      .withMessage('Invalid request ID'),
    body('response')
      .notEmpty()
      .withMessage('Response is required')
      .isIn(['ACCEPTED', 'DECLINED', 'MAYBE'])
      .withMessage('Response must be ACCEPTED, DECLINED, or MAYBE'),
    body('message')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Message cannot exceed 500 characters')
      .trim()
  ],
  respondToRequest
);

router.get(
  '/:id/donations',
  [
    param('id')
      .notEmpty()
      .withMessage('Request ID is required')
      .isString()
      .withMessage('Invalid request ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt()
  ],
  getDonations
);

router.get(
  '/stats',
  [
    query('hospitalId')
      .optional()
      .isString()
      .withMessage('Invalid hospital ID'),
    query('bloodBankId')
      .optional()
      .isString()
      .withMessage('Invalid blood bank ID'),
    query('period')
      .optional()
      .isIn(['day', 'week', 'month', 'year'])
      .withMessage('Period must be day, week, month, or year')
  ],
  getStats
);

export default router;