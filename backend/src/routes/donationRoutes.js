import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roleAuth.js';
import {
  getAllDonations,
  getDonationById,
  getDonationCertificate,
  recordDonation,
  scheduleDonation,
  updateDonationStatus
} from '../controllers/donationController.js';

const router = express.Router();

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================
router.use(authenticate);

// ============================================================================
// Donation Queries & Records
// ============================================================================

/**
 * @route   GET /api/v1/donations
 * @desc    Retrieve list of donations with filters (status, bloodType, date range, hospital, blood bank)
 * @access  Private (Blood Bank, Hospital, Admin)
 */
router.get(
  '/',
  authorize('BLOOD_BANK', 'HOSPITAL', 'ADMIN'),
  getAllDonations
);

/**
 * @route   GET /api/v1/donations/:id
 * @desc    Get detailed donation record by ID (used for receipt and certificate generation)
 * @access  Private (Donor, Blood Bank, Hospital, Admin)
 */
router.get(
  '/:id',
  authorize('DONOR', 'BLOOD_BANK', 'HOSPITAL', 'ADMIN'),
  getDonationById
);

/**
 * @route   GET /api/v1/donations/:id/certificate
 * @desc    Get verified donation certificate details
 * @access  Private (Donor, Blood Bank, Hospital, Admin)
 */
router.get(
  '/:id/certificate',
  authorize('DONOR', 'BLOOD_BANK', 'HOSPITAL', 'ADMIN'),
  getDonationCertificate
);

// ============================================================================
// Donation Lifecycle & Clinical Logging
// ============================================================================

/**
 * @route   POST /api/v1/donations
 * @desc    Record a completed donation (updates inventory, donor stats & blood request)
 * @access  Private (Blood Bank, Hospital, Admin)
 */
router.post(
  '/',
  authorize('BLOOD_BANK', 'HOSPITAL', 'ADMIN'),
  [
    body('donorId').notEmpty().withMessage('Donor ID is required'),
    body('hospitalId').notEmpty().withMessage('Hospital ID is required'),
    body('bloodBankId').notEmpty().withMessage('Blood Bank ID is required'),
    body('requestId').notEmpty().withMessage('Request ID is required'),
    body('units').optional().isInt({ min: 1 }).withMessage('Units must be a positive integer'),
    body('donationDate').optional().isISO8601().withMessage('Invalid donation date format'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  recordDonation
);

/**
 * @route   POST /api/v1/donations/schedule
 * @desc    Schedule a donation appointment for a blood request or facility drive
 * @access  Private (Donor, Blood Bank, Hospital, Admin)
 */
router.post(
  '/schedule',
  authorize('DONOR', 'BLOOD_BANK', 'HOSPITAL', 'ADMIN'),
  [
    body('hospitalId').notEmpty().withMessage('Hospital ID is required'),
    body('bloodBankId').notEmpty().withMessage('Blood Bank ID is required'),
    body('requestId').notEmpty().withMessage('Request ID is required'),
    body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
    body('units').optional().isInt({ min: 1 }).withMessage('Units must be a positive integer'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  scheduleDonation
);

/**
 * @route   PATCH /api/v1/donations/:id/status
 * @desc    Update donation status (SCHEDULED -> COMPLETED or CANCELLED)
 * @access  Private (Blood Bank, Hospital, Admin)
 */
router.patch(
  '/:id/status',
  authorize('BLOOD_BANK', 'HOSPITAL', 'ADMIN'),
  [
    body('status').isIn(['SCHEDULED', 'COMPLETED', 'CANCELLED'])
      .withMessage('Status must be SCHEDULED, COMPLETED, or CANCELLED'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  updateDonationStatus
);

export default router;