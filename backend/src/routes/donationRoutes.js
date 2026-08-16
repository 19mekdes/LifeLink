const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Protect all donation routes with JWT verification
router.use(verifyToken);

// ============================================================================
// Donation Queries & Records
// ============================================================================

// @route   GET /api/v1/donations
// @desc    Retrieve list of donations with filters (status, bloodType, date range, hospital, blood bank)
// @access  Private (Blood Bank, Hospital, Admin)
router.get(
  '/',
  requireRole(['BLOOD_BANK', 'HOSPITAL', 'ADMIN']),
  donationController.getAllDonations
);

// @route   GET /api/v1/donations/:id
// @desc    Get detailed donation record by ID (used for receipt and certificate generation)
// @access  Private (Donor, Blood Bank, Hospital, Admin)
router.get(
  '/:id',
  requireRole(['DONOR', 'BLOOD_BANK', 'HOSPITAL', 'ADMIN']),
  donationController.getDonationById
);

// @route   GET /api/v1/donations/:id/certificate
// @desc    Get verified donation certificate details
// @access  Private (Donor, Blood Bank, Hospital, Admin)
router.get(
  '/:id/certificate',
  requireRole(['DONOR', 'BLOOD_BANK', 'HOSPITAL', 'ADMIN']),
  donationController.getDonationCertificate
);

// ============================================================================
// Donation Lifecycle & Clinical Logging
// ============================================================================

// @route   POST /api/v1/donations
// @desc    Record a completed donation (updates inventory, donor stats & blood request)
// @access  Private (Blood Bank, Hospital, Admin)
router.post(
  '/',
  requireRole(['BLOOD_BANK', 'HOSPITAL', 'ADMIN']),
  donationController.recordDonation
);

// @route   POST /api/v1/donations/schedule
// @desc    Schedule a donation appointment for a blood request or facility drive
// @access  Private (Donor, Blood Bank, Hospital, Admin)
router.post(
  '/schedule',
  requireRole(['DONOR', 'BLOOD_BANK', 'HOSPITAL', 'ADMIN']),
  donationController.scheduleDonation
);

// @route   PATCH /api/v1/donations/:id/status
// @desc    Update donation status (SCHEDULED -> COMPLETED or CANCELLED)
// @access  Private (Blood Bank, Hospital, Admin)
router.patch(
  '/:id/status',
  requireRole(['BLOOD_BANK', 'HOSPITAL', 'ADMIN']),
  donationController.updateDonationStatus
);

module.exports = router;