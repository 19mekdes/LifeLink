// backend/src/middleware/roleAuth.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Role-based Authorization Middleware
 * 
 * This file provides middleware functions to check user roles and permissions.
 * It works together with the authentication middleware (auth.js) which sets req.user.
 */

/**
 * Check if user has one of the allowed roles
 * @param {...string} roles - List of allowed roles
 * @returns {Function} Express middleware
 * 
 * @example
 * // Allow only ADMIN and HOSPITAL roles
 * router.get('/admin-only', authorize('ADMIN', 'HOSPITAL'), handler);
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Check if user is a Super Admin
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/super-admin-only', isSuperAdmin, handler);
 */
export const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Super Admin access required'
    });
  }

  next();
};

/**
 * Check if user is an Admin (any admin type)
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/admin-area', isAdmin, handler);
 */
export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DONOR_ADMIN'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

/**
 * Check if user is a Hospital
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/hospital-area', isHospital, handler);
 */
export const isHospital = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'HOSPITAL') {
    return res.status(403).json({
      success: false,
      message: 'Hospital access required'
    });
  }

  next();
};

/**
 * Check if user is a Blood Bank
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/bloodbank-area', isBloodBank, handler);
 */
export const isBloodBank = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'BLOOD_BANK') {
    return res.status(403).json({
      success: false,
      message: 'Blood Bank access required'
    });
  }

  next();
};

/**
 * Check if user is a Donor
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/donor-area', isDonor, handler);
 */
export const isDonor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'DONOR') {
    return res.status(403).json({
      success: false,
      message: 'Donor access required'
    });
  }

  next();
};

/**
 * Check if user has specific permission
 * @param {string} permission - Permission to check
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/manage-users', hasPermission('manage_users'), handler);
 */
export const hasPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      // Super Admin has all permissions
      if (req.user.role === 'SUPER_ADMIN') {
        return next();
      }

      // Check user's admin profile for permissions
      const adminProfile = await prisma.adminProfile.findUnique({
        where: { userId: req.user.id }
      });

      if (!adminProfile || !adminProfile.permissions?.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${permission} required`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Check if user owns the resource
 * @param {string} model - Model name (User, Hospital, Donor, etc.)
 * @param {string} idParam - Parameter name for the ID (default: 'id')
 * @returns {Function} Express middleware
 * 
 * @example
 * // Check if user owns the hospital they're trying to update
 * router.put('/hospitals/:id', isOwner('Hospital'), handler);
 */
export const isOwner = (model, idParam = 'id') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const id = req.params[idParam];
      let resource;

      // Find the resource based on model
      switch (model) {
        case 'User':
          resource = await prisma.user.findUnique({
            where: { id }
          });
          break;
        case 'Hospital':
          resource = await prisma.hospital.findUnique({
            where: { id }
          });
          break;
        case 'Donor':
          resource = await prisma.donorProfile.findUnique({
            where: { id }
          });
          break;
        case 'BloodBank':
          resource = await prisma.bloodBank.findUnique({
            where: { id }
          });
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid model specified'
          });
      }

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check if the user owns this resource
      if (resource.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not own this resource'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Ownership check failed'
      });
    }
  };
};

/**
 * Check if user is the resource owner or an admin
 * @param {string} model - Model name
 * @param {string} idParam - Parameter name for the ID (default: 'id')
 * @returns {Function} Express middleware
 * 
 * @example
 * router.put('/hospitals/:id', isOwnerOrAdmin('Hospital'), handler);
 */
export const isOwnerOrAdmin = (model, idParam = 'id') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin can access everything
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'DONOR_ADMIN'];
    if (adminRoles.includes(req.user.role)) {
      return next();
    }

    // Otherwise, check ownership
    try {
      const id = req.params[idParam];
      let resource;

      switch (model) {
        case 'User':
          resource = await prisma.user.findUnique({ where: { id } });
          break;
        case 'Hospital':
          resource = await prisma.hospital.findUnique({ where: { id } });
          break;
        case 'Donor':
          resource = await prisma.donorProfile.findUnique({ where: { id } });
          break;
        case 'BloodBank':
          resource = await prisma.bloodBank.findUnique({ where: { id } });
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid model specified'
          });
      }

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      if (resource.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not own this resource'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Ownership check failed'
      });
    }
  };
};

// Export all functions as a single object
export default {
  authorize,
  isSuperAdmin,
  isAdmin,
  isHospital,
  isBloodBank,
  isDonor,
  hasPermission,
  isOwner,
  isOwnerOrAdmin
};