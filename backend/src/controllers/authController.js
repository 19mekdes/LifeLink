import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { sendEmail, welcomeEmail } from '../services/emailService.js';
import prisma from '../config/database.js';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-151112';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

export const register = asyncHandler(async (req, res) => {

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
    age,
    gender,
    bloodType,
    address,
    city,
    
    hospitalName,
    licenseNumber,
    
    bankName
  } = req.body;

  
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new ApiError(400, 'Email already registered. Please login.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (prisma) => {
    
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


  try {
    const emailTemplate = welcomeEmail(user.name, user.email);
    await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });
    console.log(`✅ Welcome email sent to ${user.email}`);
  } catch (emailError) {
    console.error(`❌ Failed to send welcome email to ${user.email}:`, emailError.message);
    
  }

  
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


export const login = asyncHandler(async (req, res) => {
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { email, password } = req.body;

  // Only select columns needed for login — avoids heavy JOINs
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      role: true,
      isActive: true,
    }
  });

  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is disabled. Please contact support.');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Fire-and-forget: update lastLogin without blocking the response
  prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  }).catch(() => {});

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );

  const { password: _, ...userWithoutPassword } = user;

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


export const logout = asyncHandler(async (req, res) => {
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});


const getDashboardUrl = (role) => {
  const dashboardMap = {
    'ADMIN': '/admin-dashboard.html',
    'BLOOD_BANK': '/bloodbank-dashboard.html',
    'HOSPITAL': '/hospital-dashboard.html',
    'DONOR': '/donor-dashboard.html'
  };
  return dashboardMap[role] || '/dashboard.html';
};