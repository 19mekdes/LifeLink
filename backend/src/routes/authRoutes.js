import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  logout
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone number is required'),

  // Donor validations
  body('age').optional().isInt({ min: 16, max: 100 }).withMessage('Age must be between 16 and 100'),
  body('bloodType').optional().isIn(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'])
    .withMessage('Invalid blood type'),

  // Hospital validations
  body('hospitalName').optional().notEmpty().withMessage('Hospital name is required for hospital registration'),
  body('licenseNumber').optional().notEmpty().withMessage('License number is required for hospital registration')
], register);


router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], login);


router.get('/me', authenticate, getMe);

router.post('/logout', authenticate, logout);

export default router;