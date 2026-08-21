// backend/src/validators/adminValidator.js

import { body, param, query } from 'express-validator';

/**
 * Validation for updating a user
 */
export const updateUserValidation = [
  param('id')
    .notEmpty()
    .withMessage('User ID is required'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone cannot be empty if provided'),

  body('role')
    .optional()
    .isIn(['DONOR', 'HOSPITAL', 'BLOOD_BANK', 'ADMIN'])
    .withMessage('Role must be DONOR, HOSPITAL, BLOOD_BANK, or ADMIN'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

/**
 * Validation for creating a new admin
 */
export const createAdminValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),

  body('role')
    .optional()
    .isIn(['ADMIN'])
    .withMessage('Role for this endpoint must be ADMIN')
];

/**
 * Validation for verifying a hospital
 */
export const verifyHospitalValidation = [
  param('id')
    .notEmpty()
    .withMessage('Hospital ID is required'),

  body('verificationStatus')
    .optional()
    .isIn(['PENDING', 'VERIFIED', 'REJECTED'])
    .withMessage('verificationStatus must be PENDING, VERIFIED, or REJECTED'),

  body('status')
    .optional()
    .isIn(['PENDING', 'VERIFIED', 'REJECTED'])
    .withMessage('status must be PENDING, VERIFIED, or REJECTED'),

  body('verified')
    .optional()
    .isBoolean()
    .withMessage('verified must be a boolean')
];

/**
 * Validation for verifying a blood bank
 */
export const verifyBloodBankValidation = [
  param('id')
    .notEmpty()
    .withMessage('Blood bank ID is required'),

  body('verificationStatus')
    .optional()
    .isIn(['PENDING', 'VERIFIED', 'REJECTED'])
    .withMessage('verificationStatus must be PENDING, VERIFIED, or REJECTED'),

  body('status')
    .optional()
    .isIn(['PENDING', 'VERIFIED', 'REJECTED'])
    .withMessage('status must be PENDING, VERIFIED, or REJECTED'),

  body('verified')
    .optional()
    .isBoolean()
    .withMessage('verified must be a boolean')
];

/**
 * Validation for verifying a donor
 */
export const verifyDonorValidation = [
  param('id')
    .notEmpty()
    .withMessage('Donor ID is required'),

  body('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean'),

  body('verified')
    .optional()
    .isBoolean()
    .withMessage('verified must be a boolean')
];

/**
 * Validation for export endpoint
 */
export const exportValidation = [
  query('entity')
    .optional()
    .isIn(['users', 'hospitals', 'blood-banks', 'donors', 'audit-logs', 'donations', 'blood-requests', 'requests', 'stats'])
    .withMessage('Entity must be one of: users, hospitals, blood-banks, donors, audit-logs, donations, blood-requests, stats'),

  query('format')
    .optional()
    .isIn(['csv', 'json', 'excel'])
    .withMessage('Format must be csv, json, or excel')
];

export default {
  updateUserValidation,
  createAdminValidation,
  verifyHospitalValidation,
  verifyBloodBankValidation,
  verifyDonorValidation,
  exportValidation
};
