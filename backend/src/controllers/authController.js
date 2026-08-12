import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const {
    name,
    email,
    password,
    phone,
    role,
    // Donor fields
    age,
    gender,
    bloodType,
    address,
    city,
    // Hospital fields
    hospitalName,
    licenseNumber,
    // Blood Bank fields
    bankName
  } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new ApiError(400, 'Email already registered. Please login.');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user with transaction
  const result = await prisma.$transaction(async (prisma) => {
    // 1. Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: role || 'DONOR',
        isActive: true
      }
    });

    // 2. Create role-specific profile
    if (role === 'DONOR' || !role) {
      await prisma.donorProfile.create({
        data: {
          userId: user.id,
          age: parseInt(age),
          gender,
          bloodType,
          address,
          city: city || 'Addis Ababa',
          country: 'Ethiopia',
          isVerified: false,
          availabilityStatus: 'AVAILABLE',
          reliabilityScore: 50
        }
      });
    } else if (role === 'HOSPITAL') {
      await prisma.hospital.create({
        data: {
          userId: user.id,
          hospitalName,
          licenseNumber,
          address,
          city: city || 'Addis Ababa',
          phone,
          verificationStatus: 'PENDING',
          isActive: true
        }
      });
    } else if (role === 'BLOOD_BANK') {
      await prisma.bloodBank.create({
        data: {
          userId: user.id,
          bankName: bankName || hospitalName,
          licenseNumber: licenseNumber || `BB-${Date.now()}`,
          address,
          city: city || 'Addis Ababa',
          phone,
          verificationStatus: 'VERIFIED',
          isActive: true
        }
      });
    }

    return user;
  });

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: result.id,
      email: result.email,
      role: result.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );

  // Get complete user data with profile
  const user = await prisma.user.findUnique({
    where: { id: result.id },
    include: {
      donorProfile: true,
      hospital: true,
      bloodBank: true
    }
  });

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.status(201).json({
    success: true,
    data: {
      token,
      user: userWithoutPassword
    },
    message: 'Registration successful! Welcome to LifeLink.'
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { email, password } = req.body;

  // Find user with all profiles
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      donorProfile: true,
      hospital: true,
      bloodBank: true
    }
  });

  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError(403, 'Account is disabled. Please contact support.');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  // Get dashboard URL based on role
  const dashboardUrl = getDashboardUrl(user.role);

  res.json({
    success: true,
    data: {
      token,
      user: userWithoutPassword,
      dashboard: dashboardUrl
    },
    message: 'Login successful!'
  });
});

/**
 * Get current user
 * GET /api/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      donorProfile: true,
      hospital: true,
      bloodBank: true
    }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const { password, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: userWithoutPassword
  });
});

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  // Client side will remove the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Get dashboard URL based on role
 */
const getDashboardUrl = (role) => {
  const dashboardMap = {
    'ADMIN': '/admin-dashboard.html',
    'BLOOD_BANK': '/bloodbank-dashboard.html',
    'HOSPITAL': '/hospital-dashboard.html',
    'DONOR': '/donor-dashboard.html'
  };
  return dashboardMap[role] || '/dashboard.html';
};