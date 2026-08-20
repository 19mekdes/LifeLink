// backend/src/controllers/adminController.js

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { createAuditLog, getAuditLogs as queryAuditLogs } from '../services/auditService.js';

const prisma = new PrismaClient();

// ==========================================
// 1. GET /api/admin/dashboard
// ==========================================
export const getDashboard = asyncHandler(async (req, res) => {
  const { timeframe } = req.query; // 'today' | 'week' | 'month' | 'all' | 'alltime'
  let dateFilter = undefined;
  if (timeframe && timeframe !== 'all' && timeframe !== 'alltime') {
    const now = new Date();
    if (timeframe === 'today') {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (timeframe === 'week') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'month') {
      dateFilter = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
  }

  const createdFilter = dateFilter ? { createdAt: { gte: dateFilter } } : {};

  const [
    totalUsers,
    activeUsers,
    totalHospitals,
    pendingHospitals,
    verifiedHospitals,
    totalBloodBanks,
    pendingBloodBanks,
    totalDonors,
    verifiedDonors,
    totalRequests,
    pendingRequests,
    urgentRequests,
    totalDonations,
    completedDonations,
    recentUsers,
    recentRequests,
    recentAuditLogs,
    lowStockItems
  ] = await Promise.all([
    prisma.user.count({ where: createdFilter }),
    prisma.user.count({ where: { isActive: true, ...createdFilter } }),
    prisma.hospital.count({ where: createdFilter }),
    prisma.hospital.count({ where: { verificationStatus: 'PENDING', ...createdFilter } }),
    prisma.hospital.count({ where: { verificationStatus: 'VERIFIED', ...createdFilter } }),
    prisma.bloodBank.count({ where: createdFilter }),
    prisma.bloodBank.count({ where: { verificationStatus: 'PENDING', ...createdFilter } }),
    prisma.donorProfile.count({ where: createdFilter }),
    prisma.donorProfile.count({ where: { isVerified: true, ...createdFilter } }),
    prisma.bloodRequest.count({ where: createdFilter }),
    prisma.bloodRequest.count({ where: { status: 'PENDING', ...createdFilter } }),
    prisma.bloodRequest.count({
      where: {
        urgency: { in: ['URGENT', 'CRITICAL_EMERGENCY'] },
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
        ...createdFilter
      }
    }),
    prisma.donation.count({ where: createdFilter }),
    prisma.donation.count({ where: { status: 'COMPLETED', ...createdFilter } }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    }),
    prisma.bloodRequest.findMany({
      where: createdFilter,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        hospital: {
          select: {
            hospitalName: true,
            city: true
          }
        }
      }
    }),
    prisma.auditLog.findMany({
      where: createdFilter,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      }
    }),
    prisma.inventoryItem.findMany({
      where: { unitsAvailable: { lte: 5 } },
      select: { bloodType: true, unitsAvailable: true }
    })
  ]);

  // Aggregate donation units
  const donationUnitsAgg = await prisma.donation.aggregate({
    where: createdFilter,
    _sum: { units: true }
  });

  const totalUnitsDonated = donationUnitsAgg._sum.units || 0;

  const criticalShortageCount = (lowStockItems || []).length;

  res.json({
    success: true,
    data: {
      metrics: {
        users: {
          total: totalUsers,
          active: activeUsers
        },
        hospitals: {
          total: totalHospitals,
          pending: pendingHospitals,
          verified: verifiedHospitals
        },
        bloodBanks: {
          total: totalBloodBanks,
          pending: pendingBloodBanks
        },
        donors: {
          total: totalDonors,
          verified: verifiedDonors,
          unverified: totalDonors - verifiedDonors
        },
        requests: {
          total: totalRequests,
          pending: pendingRequests,
          urgent: urgentRequests
        },
        donations: {
          total: totalDonations,
          completed: completedDonations,
          totalUnits: totalUnitsDonated
        },
        pendingVerifications: pendingHospitals + pendingBloodBanks + (totalDonors - verifiedDonors),
        criticalAlerts: {
          lowStockCount: criticalShortageCount,
          lowStockItems: lowStockItems.map(i => ({ bloodType: i.bloodType, unitsAvailable: i.unitsAvailable })),
          unfulfilledEmergencyCount: urgentRequests,
          totalAlerts: (criticalShortageCount > 0 ? 1 : 0) + (urgentRequests > 0 ? 1 : 0)
        },
        verificationBottlenecks: {
          pendingHospitals,
          pendingBloodBanks,
          unverifiedDonors: totalDonors - verifiedDonors,
          totalPending: pendingHospitals + pendingBloodBanks + (totalDonors - verifiedDonors)
        }
      },
      recentUsers,
      recentRequests,
      recentAuditLogs
    },
    message: 'Admin dashboard overview fetched successfully'
  });
});

// ==========================================
// 2. GET /api/admin/users
// ==========================================
export const getUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    role,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (role) {
    where.role = role;
  }

  if (isActive !== undefined && isActive !== '') {
    where.isActive = isActive === 'true' || isActive === true;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } }
    ];
  }

  const orderBy = {};
  const validSortFields = ['name', 'email', 'role', 'isActive', 'createdAt', 'lastLogin'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  orderBy[sortField] = sortOrder === 'asc' ? 'asc' : 'desc';

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        donorProfile: {
          select: {
            id: true,
            bloodType: true,
            city: true,
            isVerified: true,
            availabilityStatus: true,
            totalDonations: true
          }
        },
        hospital: {
          select: {
            id: true,
            hospitalName: true,
            licenseNumber: true,
            city: true,
            verificationStatus: true
          }
        },
        bloodBank: {
          select: {
            id: true,
            bankName: true,
            licenseNumber: true,
            city: true,
            verificationStatus: true
          }
        }
      },
      skip,
      take: limitNum,
      orderBy
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

// ==========================================
// 3. GET /api/admin/users/:id
// ==========================================
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      donorProfile: {
        include: {
          donations: {
            take: 5,
            orderBy: { donationDate: 'desc' }
          }
        }
      },
      hospital: {
        include: {
          bloodRequests: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      },
      bloodBank: {
        include: {
          inventory: true
        }
      },
      auditLogs: {
        take: 10,
        orderBy: { createdAt: 'desc' }
      }
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

// ==========================================
// 4. PUT /api/admin/users/:id
// ==========================================
export const updateUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { id } = req.params;
  const { name, email, phone, role, isActive } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { id }
  });

  if (!existingUser) {
    throw new ApiError(404, 'User not found');
  }

  // If email is being changed, check if it's already used by another user
  if (email && email !== existingUser.email) {
    const emailInUse = await prisma.user.findUnique({
      where: { email }
    });
    if (emailInUse) {
      throw new ApiError(400, 'Email is already in use by another account');
    }
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (role !== undefined) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  // Log action
  await createAuditLog({
    userId: req.user.id,
    action: 'UPDATE_USER',
    entity: 'User',
    entityId: id,
    changes: updateData,
    req
  });

  res.json({
    success: true,
    data: updatedUser,
    message: 'User updated successfully'
  });
});

// ==========================================
// 5. DELETE /api/admin/users/:id
// ==========================================
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permanent = false } = req.query;

  const user = await prisma.user.findUnique({
    where: { id }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (req.user.id === id) {
    throw new ApiError(400, 'You cannot delete or deactivate your own admin account');
  }

  if (permanent === 'true' || permanent === true) {
    await prisma.user.delete({
      where: { id }
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'PERMANENT_DELETE_USER',
      entity: 'User',
      entityId: id,
      changes: { email: user.email, name: user.name, role: user.role },
      req
    });

    return res.json({
      success: true,
      message: 'User permanently deleted successfully'
    });
  }

  // Default behavior: soft-delete by deactivating account
  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true
    }
  });

  await createAuditLog({
    userId: req.user.id,
    action: 'DEACTIVATE_USER',
    entity: 'User',
    entityId: id,
    changes: { isActive: false },
    req
  });

  res.json({
    success: true,
    data: updatedUser,
    message: 'User deactivated successfully'
  });
});

// ==========================================
// 6. POST /api/admin/admins
// ==========================================
export const createAdmin = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { name, email, password, phone } = req.body;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new ApiError(400, 'Email is already registered');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newAdmin = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'ADMIN',
      isActive: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  await createAuditLog({
    userId: req.user.id,
    action: 'CREATE_ADMIN',
    entity: 'User',
    entityId: newAdmin.id,
    changes: { email: newAdmin.email, name: newAdmin.name, role: 'ADMIN' },
    req
  });

  res.status(201).json({
    success: true,
    data: newAdmin,
    message: 'Admin user created successfully'
  });
});

// ==========================================
// 7. GET /api/admin/hospitals
// ==========================================
export const getHospitals = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    verificationStatus,
    city,
    isActive
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  const vStatus = verificationStatus || status;
  if (vStatus) {
    where.verificationStatus = vStatus;
  }

  if (city) {
    where.city = { contains: city, mode: 'insensitive' };
  }

  if (isActive !== undefined && isActive !== '') {
    where.isActive = isActive === 'true' || isActive === true;
  }

  if (search) {
    where.OR = [
      { hospitalName: { contains: search, mode: 'insensitive' } },
      { licenseNumber: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [hospitals, total] = await Promise.all([
    prisma.hospital.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            bloodRequests: true,
            donations: true
          }
        }
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.hospital.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      hospitals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

// ==========================================
// 8. PUT /api/admin/hospitals/:id/verify
// ==========================================
export const verifyHospital = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { id } = req.params;
  const { status, verificationStatus, verified } = req.body;

  // Resolve target status: VERIFIED, REJECTED, or PENDING
  let newStatus = 'VERIFIED';
  if (verificationStatus) {
    newStatus = verificationStatus;
  } else if (status) {
    newStatus = status;
  } else if (verified !== undefined) {
    newStatus = (verified === true || verified === 'true') ? 'VERIFIED' : 'REJECTED';
  }

  // Check if hospital exists by ID or userId
  let hospital = await prisma.hospital.findFirst({
    where: {
      OR: [{ id }, { userId: id }]
    }
  });

  if (!hospital) {
    throw new ApiError(404, 'Hospital not found');
  }

  const updatedHospital = await prisma.hospital.update({
    where: { id: hospital.id },
    data: {
      verificationStatus: newStatus,
      verifiedBy: req.user.name || req.user.email || req.user.id,
      verifiedAt: newStatus === 'VERIFIED' ? new Date() : null
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true
        }
      }
    }
  });

  await createAuditLog({
    userId: req.user.id,
    action: 'VERIFY_HOSPITAL',
    entity: 'Hospital',
    entityId: hospital.id,
    changes: {
      previousStatus: hospital.verificationStatus,
      newStatus,
      hospitalName: hospital.hospitalName
    },
    req
  });

  res.json({
    success: true,
    data: updatedHospital,
    message: `Hospital verification status updated to ${newStatus}`
  });
});

// ==========================================
// 9. GET /api/admin/blood-banks
// ==========================================
export const getBloodBanks = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    verificationStatus,
    city,
    isActive
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  const vStatus = verificationStatus || status;
  if (vStatus) {
    where.verificationStatus = vStatus;
  }

  if (city) {
    where.city = { contains: city, mode: 'insensitive' };
  }

  if (isActive !== undefined && isActive !== '') {
    where.isActive = isActive === 'true' || isActive === true;
  }

  if (search) {
    where.OR = [
      { bankName: { contains: search, mode: 'insensitive' } },
      { licenseNumber: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [bloodBanks, total] = await Promise.all([
    prisma.bloodBank.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            inventory: true,
            bloodRequests: true,
            donations: true
          }
        }
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.bloodBank.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      bloodBanks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

// ==========================================
// 10. PUT /api/admin/blood-banks/:id/verify
// ==========================================
export const verifyBloodBank = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { id } = req.params;
  const { status, verificationStatus, verified } = req.body;

  let newStatus = 'VERIFIED';
  if (verificationStatus) {
    newStatus = verificationStatus;
  } else if (status) {
    newStatus = status;
  } else if (verified !== undefined) {
    newStatus = (verified === true || verified === 'true') ? 'VERIFIED' : 'REJECTED';
  }

  let bloodBank = await prisma.bloodBank.findFirst({
    where: {
      OR: [{ id }, { userId: id }]
    }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const updatedBloodBank = await prisma.bloodBank.update({
    where: { id: bloodBank.id },
    data: {
      verificationStatus: newStatus
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true
        }
      }
    }
  });

  await createAuditLog({
    userId: req.user.id,
    action: 'VERIFY_BLOOD_BANK',
    entity: 'BloodBank',
    entityId: bloodBank.id,
    changes: {
      previousStatus: bloodBank.verificationStatus,
      newStatus,
      bankName: bloodBank.bankName
    },
    req
  });

  res.json({
    success: true,
    data: updatedBloodBank,
    message: `Blood Bank verification status updated to ${newStatus}`
  });
});

// ==========================================
// 11. GET /api/admin/donors
// ==========================================
export const getDonors = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    bloodType,
    isVerified,
    availabilityStatus,
    city
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (bloodType) {
    where.bloodType = bloodType;
  }

  if (isVerified !== undefined && isVerified !== '') {
    where.isVerified = isVerified === 'true' || isVerified === true;
  }

  if (availabilityStatus) {
    where.availabilityStatus = availabilityStatus;
  }

  if (city) {
    where.city = { contains: city, mode: 'insensitive' };
  }

  if (search) {
    where.OR = [
      { city: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { phone: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [donors, total] = await Promise.all([
    prisma.donorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            donations: true,
            donorResponses: true
          }
        }
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.donorProfile.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      donors,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

// ==========================================
// 12. PUT /api/admin/donors/:id/verify
// ==========================================
export const verifyDonor = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { id } = req.params;
  const { isVerified, verified } = req.body;

  let targetVerified = true;
  if (isVerified !== undefined) {
    targetVerified = isVerified === true || isVerified === 'true';
  } else if (verified !== undefined) {
    targetVerified = verified === true || verified === 'true';
  }

  let donor = await prisma.donorProfile.findFirst({
    where: {
      OR: [{ id }, { userId: id }]
    }
  });

  if (!donor) {
    throw new ApiError(404, 'Donor profile not found');
  }

  const updatedDonor = await prisma.donorProfile.update({
    where: { id: donor.id },
    data: {
      isVerified: targetVerified
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true
        }
      }
    }
  });

  await createAuditLog({
    userId: req.user.id,
    action: 'VERIFY_DONOR',
    entity: 'DonorProfile',
    entityId: donor.id,
    changes: {
      previousVerification: donor.isVerified,
      newVerification: targetVerified
    },
    req
  });

  res.json({
    success: true,
    data: updatedDonor,
    message: `Donor verification status updated to ${targetVerified ? 'Verified' : 'Unverified'}`
  });
});

// ==========================================
// 13. GET /api/admin/audit-logs
// ==========================================
export const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    action,
    entity,
    userId,
    search,
    startDate,
    endDate
  } = req.query;

  const result = await queryAuditLogs({
    page,
    limit,
    action,
    entity,
    userId,
    search,
    startDate,
    endDate
  });

  res.json({
    success: true,
    data: result
  });
});

// ==========================================
// 14. GET /api/admin/stats
// ==========================================
export const getStats = asyncHandler(async (req, res) => {
  const [
    usersByRole,
    activeUsersCount,
    inactiveUsersCount,
    hospitalsByStatus,
    bloodBanksByStatus,
    donorsByBloodType,
    verifiedDonorsCount,
    requestsByStatus,
    requestsByUrgency,
    donationsByStatus,
    donationUnits
  ] = await Promise.all([
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.hospital.groupBy({
      by: ['verificationStatus'],
      _count: { id: true }
    }),
    prisma.bloodBank.groupBy({
      by: ['verificationStatus'],
      _count: { id: true }
    }),
    prisma.donorProfile.groupBy({
      by: ['bloodType'],
      _count: { id: true }
    }),
    prisma.donorProfile.count({ where: { isVerified: true } }),
    prisma.bloodRequest.groupBy({
      by: ['status'],
      _count: { id: true }
    }),
    prisma.bloodRequest.groupBy({
      by: ['urgency'],
      _count: { id: true }
    }),
    prisma.donation.groupBy({
      by: ['status'],
      _count: { id: true }
    }),
    prisma.donation.aggregate({
      _sum: { units: true }
    })
  ]);

  res.json({
    success: true,
    data: {
      users: {
        byRole: usersByRole.reduce((acc, curr) => {
          acc[curr.role] = curr._count.id;
          return acc;
        }, {}),
        active: activeUsersCount,
        inactive: inactiveUsersCount,
        total: activeUsersCount + inactiveUsersCount
      },
      hospitals: {
        byVerificationStatus: hospitalsByStatus.reduce((acc, curr) => {
          acc[curr.verificationStatus] = curr._count.id;
          return acc;
        }, {}),
        total: hospitalsByStatus.reduce((sum, curr) => sum + curr._count.id, 0)
      },
      bloodBanks: {
        byVerificationStatus: bloodBanksByStatus.reduce((acc, curr) => {
          acc[curr.verificationStatus] = curr._count.id;
          return acc;
        }, {}),
        total: bloodBanksByStatus.reduce((sum, curr) => sum + curr._count.id, 0)
      },
      donors: {
        byBloodType: donorsByBloodType.reduce((acc, curr) => {
          acc[curr.bloodType] = curr._count.id;
          return acc;
        }, {}),
        verified: verifiedDonorsCount,
        total: donorsByBloodType.reduce((sum, curr) => sum + curr._count.id, 0)
      },
      bloodRequests: {
        byStatus: requestsByStatus.reduce((acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        }, {}),
        byUrgency: requestsByUrgency.reduce((acc, curr) => {
          acc[curr.urgency] = curr._count.id;
          return acc;
        }, {}),
        total: requestsByStatus.reduce((sum, curr) => sum + curr._count.id, 0)
      },
      donations: {
        byStatus: donationsByStatus.reduce((acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        }, {}),
        totalUnits: donationUnits._sum.units || 0,
        total: donationsByStatus.reduce((sum, curr) => sum + curr._count.id, 0)
      }
    },
    message: 'System statistics fetched successfully'
  });
});

// ==========================================
// 14b. GET /api/admin/stats/summary
// ==========================================
export const getSummaryStats = asyncHandler(async (req, res) => {
  const [
    totalDonors,
    verifiedDonors,
    totalHospitals,
    verifiedHospitals,
    totalBloodBanks,
    verifiedBloodBanks,
    totalUsers,
    activeUsers,
    totalBloodRequests,
    fulfilledRequests,
    totalDonations,
    completedDonations,
    totalUnitsDonated
  ] = await Promise.all([
    prisma.donorProfile.count(),
    prisma.donorProfile.count({ where: { isVerified: true } }),
    prisma.hospital.count(),
    prisma.hospital.count({ where: { verificationStatus: 'VERIFIED' } }),
    prisma.bloodBank.count(),
    prisma.bloodBank.count({ where: { verificationStatus: 'VERIFIED' } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.bloodRequest.count(),
    prisma.bloodRequest.count({ where: { status: 'FULFILLED' } }),
    prisma.donation.count(),
    prisma.donation.count({ where: { status: 'COMPLETED' } }),
    prisma.donation.aggregate({ _sum: { units: true } })
  ]);

  const summary = [
    { entity: 'Registered Users', total: totalUsers, active: activeUsers, metricLabel: `${activeUsers} Active Accounts`, status: 'Live DB' },
    { entity: 'Donors', total: totalDonors, active: verifiedDonors, metricLabel: `${verifiedDonors} Verified Donors`, status: 'Live DB' },
    { entity: 'Hospitals', total: totalHospitals, active: verifiedHospitals, metricLabel: `${verifiedHospitals} Verified Facilities`, status: 'Live DB' },
    { entity: 'Blood Banks', total: totalBloodBanks, active: verifiedBloodBanks, metricLabel: `${verifiedBloodBanks} Verified Centers`, status: 'Live DB' },
    { entity: 'Blood Requests', total: totalBloodRequests, active: fulfilledRequests, metricLabel: `${fulfilledRequests} Fulfilled Requests`, status: 'Live DB' },
    { entity: 'Donations Recorded', total: totalDonations, active: completedDonations, metricLabel: `${totalUnitsDonated._sum.units || 0} Units Donated`, status: 'Live DB' }
  ];

  res.json({
    success: true,
    data: {
      totals: {
        totalDonors,
        verifiedDonors,
        totalHospitals,
        verifiedHospitals,
        totalBloodBanks,
        verifiedBloodBanks,
        totalUsers,
        activeUsers,
        totalBloodRequests,
        fulfilledRequests,
        totalDonations,
        completedDonations,
        totalUnitsDonated: totalUnitsDonated._sum.units || 0
      },
      summaryTable: summary,
      timestamp: new Date().toISOString()
    },
    message: 'System summary totals fetched successfully'
  });
});

// ==========================================
// 15. GET /api/admin/export
// ==========================================
export const exportData = asyncHandler(async (req, res) => {
  const { entity = 'users', format = 'csv' } = req.query;

  let records = [];
  let headers = [];

  switch (entity.toLowerCase()) {
    case 'users': {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLogin: true
        },
        orderBy: { createdAt: 'desc' }
      });
      headers = ['id', 'name', 'email', 'phone', 'role', 'isActive', 'createdAt', 'lastLogin'];
      records = users;
      break;
    }

    case 'hospitals': {
      const hospitals = await prisma.hospital.findMany({
        include: {
          user: { select: { email: true, phone: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      headers = ['id', 'hospitalName', 'licenseNumber', 'email', 'phone', 'city', 'verificationStatus', 'isActive', 'createdAt'];
      records = hospitals.map(h => ({
        id: h.id,
        hospitalName: h.hospitalName,
        licenseNumber: h.licenseNumber,
        email: h.user?.email || '',
        phone: h.phone || h.user?.phone || '',
        city: h.city,
        verificationStatus: h.verificationStatus,
        isActive: h.isActive,
        createdAt: h.createdAt
      }));
      break;
    }

    case 'blood-banks':
    case 'bloodbanks': {
      const bloodBanks = await prisma.bloodBank.findMany({
        include: {
          user: { select: { email: true, phone: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      headers = ['id', 'bankName', 'licenseNumber', 'email', 'phone', 'city', 'verificationStatus', 'isActive', 'createdAt'];
      records = bloodBanks.map(b => ({
        id: b.id,
        bankName: b.bankName,
        licenseNumber: b.licenseNumber,
        email: b.user?.email || '',
        phone: b.phone || b.user?.phone || '',
        city: b.city,
        verificationStatus: b.verificationStatus,
        isActive: b.isActive,
        createdAt: b.createdAt
      }));
      break;
    }

    case 'donors': {
      const donors = await prisma.donorProfile.findMany({
        include: {
          user: { select: { name: true, email: true, phone: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      headers = ['id', 'name', 'email', 'phone', 'bloodType', 'age', 'gender', 'city', 'isVerified', 'availabilityStatus', 'totalDonations', 'createdAt'];
      records = donors.map(d => ({
        id: d.id,
        name: d.user?.name || '',
        email: d.user?.email || '',
        phone: d.user?.phone || '',
        bloodType: d.bloodType,
        age: d.age,
        gender: d.gender,
        city: d.city,
        isVerified: d.isVerified,
        availabilityStatus: d.availabilityStatus,
        totalDonations: d.totalDonations,
        createdAt: d.createdAt
      }));
      break;
    }

    case 'audit-logs':
    case 'auditlogs': {
      const logs = await prisma.auditLog.findMany({
        include: {
          user: { select: { email: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 1000
      });
      headers = ['id', 'action', 'entity', 'entityId', 'performedBy', 'ipAddress', 'createdAt'];
      records = logs.map(l => ({
        id: l.id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        performedBy: l.user?.email || l.userId,
        ipAddress: l.ipAddress || '',
        createdAt: l.createdAt
      }));
      break;
    }

    case 'donations': {
      const donations = await prisma.donation.findMany({
        include: {
          donor: { include: { user: { select: { name: true } } } },
          hospital: { select: { hospitalName: true } }
        },
        orderBy: { donationDate: 'desc' }
      });
      headers = ['id', 'donorName', 'hospitalName', 'units', 'status', 'donationDate'];
      records = donations.map(d => ({
        id: d.id,
        donorName: d.donor?.user?.name || '',
        hospitalName: d.hospital?.hospitalName || '',
        units: d.units,
        status: d.status,
        donationDate: d.donationDate
      }));
      break;
    }

    case 'blood-requests':
    case 'requests': {
      const requests = await prisma.bloodRequest.findMany({
        include: {
          hospital: { select: { hospitalName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      headers = ['id', 'hospitalName', 'bloodType', 'unitsRequired', 'urgency', 'status', 'location', 'requestedAt'];
      records = requests.map(r => ({
        id: r.id,
        hospitalName: r.hospital?.hospitalName || '',
        bloodType: r.bloodType,
        unitsRequired: r.unitsRequired,
        urgency: r.urgency,
        status: r.status,
        location: r.location,
        requestedAt: r.requestedAt
      }));
      break;
    }

    default:
      throw new ApiError(400, `Invalid export entity: ${entity}. Allowed entities: users, hospitals, blood-banks, donors, audit-logs, donations, blood-requests`);
  }

  // Format as JSON if requested
  if (format.toLowerCase() === 'json') {
    return res.json({
      success: true,
      data: records,
      message: `Exported ${records.length} ${entity} records`
    });
  }

  // Format as CSV
  const csvRows = [];
  // Add CSV Header
  csvRows.push(headers.map(h => `"${h}"`).join(','));

  // Add Data Rows
  for (const row of records) {
    const values = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) {
        val = '';
      } else if (val instanceof Date) {
        val = val.toISOString();
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      const stringVal = String(val).replace(/"/g, '""');
      return `"${stringVal}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  const filename = `lifelink-${entity}-${Date.now()}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csvContent);
});

// ==========================================
// 16. GET /api/admin/stats/blood-inventory
// ==========================================
export const getBloodInventoryStats = asyncHandler(async (req, res) => {
  const { timeframe } = req.query;
  let dateFilter = null;
  const now = new Date();

  if (timeframe === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dateFilter = { gte: startOfToday };
  } else if (timeframe === 'week') {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    dateFilter = { gte: startOfWeek };
  } else if (timeframe === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter = { gte: startOfMonth };
  }

  const bloodTypes = [
    { key: 'A_POS', label: 'A+' },
    { key: 'A_NEG', label: 'A-' },
    { key: 'B_POS', label: 'B+' },
    { key: 'B_NEG', label: 'B-' },
    { key: 'AB_POS', label: 'AB+' },
    { key: 'AB_NEG', label: 'AB-' },
    { key: 'O_POS', label: 'O+' },
    { key: 'O_NEG', label: 'O-' }
  ];

  const inventoryItems = await prisma.inventoryItem.groupBy({
    by: ['bloodType'],
    _sum: { unitsAvailable: true, unitsReserved: true }
  });

  const donationWhere = { status: 'COMPLETED' };
  if (dateFilter) {
    donationWhere.createdAt = dateFilter;
  }

  const donatedUnits = await prisma.donation.findMany({
    where: donationWhere,
    select: {
      units: true,
      request: { select: { bloodType: true } },
      donor: { select: { bloodType: true } }
    }
  });

  const requestWhere = { status: 'FULFILLED' };
  if (dateFilter) {
    requestWhere.updatedAt = dateFilter;
  }

  const fulfilledRequests = await prisma.bloodRequest.groupBy({
    by: ['bloodType'],
    where: requestWhere,
    _sum: { unitsFulfilled: true, unitsRequired: true }
  });

  const inventoryMap = {};
  inventoryItems.forEach(item => {
    inventoryMap[item.bloodType] = item._sum.unitsAvailable || 0;
  });

  const donatedMap = {};
  donatedUnits.forEach(d => {
    const bt = d.request?.bloodType || d.donor?.bloodType;
    if (bt) {
      donatedMap[bt] = (donatedMap[bt] || 0) + (d.units || 1);
    }
  });

  const issuedMap = {};
  fulfilledRequests.forEach(r => {
    issuedMap[r.bloodType] = r._sum.unitsFulfilled || r._sum.unitsRequired || 0;
  });

  const seriesData = bloodTypes.map(bt => {
    const donated = donatedMap[bt.key] || 0;
    const issued = issuedMap[bt.key] || 0;
    const recordedStock = inventoryMap[bt.key];
    const inStock = recordedStock !== undefined ? recordedStock : Math.max(0, donated - issued);

    return {
      type: bt.label,
      bloodTypeKey: bt.key,
      donated,
      issued,
      inStock
    };
  });

  res.json({
    success: true,
    data: {
      categories: bloodTypes.map(b => b.label),
      series: seriesData,
      totals: {
        donated: seriesData.reduce((acc, s) => acc + s.donated, 0),
        issued: seriesData.reduce((acc, s) => acc + s.issued, 0),
        inStock: seriesData.reduce((acc, s) => acc + s.inStock, 0)
      }
    },
    message: 'Blood inventory statistics fetched successfully'
  });
});

// ==========================================
// 17. GET /api/admin/stats/signups
// ==========================================
export const getSignupsStats = asyncHandler(async (req, res) => {
  const { period = 'daily' } = req.query; // daily | weekly | monthly | yearly
  const now = new Date();
  const labels = [];
  const donorsCount = [];
  const hospitalsCount = [];
  const bloodBanksCount = [];

  if (period === 'yearly') {
    // Last 4 years
    const currentYear = now.getFullYear();
    for (let y = currentYear - 3; y <= currentYear; y++) {
      const start = new Date(y, 0, 1, 0, 0, 0);
      const end = new Date(y + 1, 0, 1, 0, 0, 0);
      labels.push(String(y));

      const [donors, hospitals, bloodBanks] = await Promise.all([
        prisma.user.count({
          where: { role: 'DONOR', createdAt: { gte: start, lt: end } }
        }),
        prisma.user.count({
          where: { role: 'HOSPITAL', createdAt: { gte: start, lt: end } }
        }),
        prisma.user.count({
          where: { role: 'BLOOD_BANK', createdAt: { gte: start, lt: end } }
        })
      ]);

      donorsCount.push(donors);
      hospitalsCount.push(hospitals);
      bloodBanksCount.push(bloodBanks);
    }
  } else if (period === 'monthly') {
    // Last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      labels.push(label);

      const [donors, hospitals, bloodBanks] = await Promise.all([
        prisma.user.count({
          where: { role: 'DONOR', createdAt: { gte: d, lt: nextMonth } }
        }),
        prisma.user.count({
          where: { role: 'HOSPITAL', createdAt: { gte: d, lt: nextMonth } }
        }),
        prisma.user.count({
          where: { role: 'BLOOD_BANK', createdAt: { gte: d, lt: nextMonth } }
        })
      ]);

      donorsCount.push(donors);
      hospitalsCount.push(hospitals);
      bloodBanksCount.push(bloodBanks);
    }
  } else if (period === 'weekly') {
    // Last 12 weeks
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const label = `W-${12 - i}`;
      labels.push(label);

      const [donors, hospitals, bloodBanks] = await Promise.all([
        prisma.user.count({
          where: { role: 'DONOR', createdAt: { gte: start, lt: end } }
        }),
        prisma.user.count({
          where: { role: 'HOSPITAL', createdAt: { gte: start, lt: end } }
        }),
        prisma.user.count({
          where: { role: 'BLOOD_BANK', createdAt: { gte: start, lt: end } }
        })
      ]);

      donorsCount.push(donors);
      hospitalsCount.push(hospitals);
      bloodBanksCount.push(bloodBanks);
    }
  } else {
    // Daily (Last 30 days)
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0);
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
      const label = dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      labels.push(label);

      const [donors, hospitals, bloodBanks] = await Promise.all([
        prisma.user.count({
          where: { role: 'DONOR', createdAt: { gte: dayStart, lte: dayEnd } }
        }),
        prisma.user.count({
          where: { role: 'HOSPITAL', createdAt: { gte: dayStart, lte: dayEnd } }
        }),
        prisma.user.count({
          where: { role: 'BLOOD_BANK', createdAt: { gte: dayStart, lte: dayEnd } }
        })
      ]);

      donorsCount.push(donors);
      hospitalsCount.push(hospitals);
      bloodBanksCount.push(bloodBanks);
    }
  }

  res.json({
    success: true,
    data: {
      period,
      labels,
      series: {
        donors: donorsCount,
        hospitals: hospitalsCount,
        bloodBanks: bloodBanksCount
      },
      summary: {
        totalDonors: donorsCount.reduce((a, b) => a + b, 0),
        totalHospitals: hospitalsCount.reduce((a, b) => a + b, 0),
        totalBloodBanks: bloodBanksCount.reduce((a, b) => a + b, 0)
      }
    },
    message: `Signup trends (${period}) fetched successfully`
  });
});

// ==========================================
// 18. GET /api/admin/stats/request-types
// ==========================================
export const getRequestTypesStats = asyncHandler(async (req, res) => {
  const { timeframe } = req.query; // 'today' | 'week' | 'month' | 'all' | 'alltime'
  let dateFilter = undefined;
  if (timeframe && timeframe !== 'all' && timeframe !== 'alltime') {
    const now = new Date();
    if (timeframe === 'today') {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (timeframe === 'week') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'month') {
      dateFilter = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
  }

  const where = dateFilter ? { createdAt: { gte: dateFilter } } : {};

  const urgencyCounts = await prisma.bloodRequest.groupBy({
    by: ['urgency'],
    where,
    _count: { id: true }
  });

  const countMap = {};
  let total = 0;
  urgencyCounts.forEach(item => {
    countMap[item.urgency] = item._count.id;
    total += item._count.id;
  });

  const urgencyTypes = [
    { key: 'CRITICAL_EMERGENCY', label: 'Critical Emergency', color: '#dc2626' },
    { key: 'URGENT', label: 'Urgent', color: '#d97706' },
    { key: 'NORMAL', label: 'Normal', color: '#2563eb' }
  ];

  const series = urgencyTypes.map(t => {
    const count = countMap[t.key] || 0;
    const percentage = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
    return {
      key: t.key,
      label: t.label,
      count,
      percentage,
      color: t.color
    };
  });

  res.json({
    success: true,
    data: {
      timeframe: timeframe || 'alltime',
      total,
      categories: series.map(s => s.label),
      counts: series.map(s => s.count),
      percentages: series.map(s => s.percentage),
      colors: series.map(s => s.color),
      series
    },
    message: 'Request types statistics fetched successfully'
  });
});

// ==========================================
// 18b. GET /api/admin/stats/fulfillment
// ==========================================
export const getFulfillmentStats = asyncHandler(async (req, res) => {
  const { timeframe } = req.query; // 'today' | 'week' | 'month' | 'all' | 'alltime'
  let dateFilter = undefined;
  if (timeframe && timeframe !== 'all' && timeframe !== 'alltime') {
    const now = new Date();
    if (timeframe === 'today') {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (timeframe === 'week') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'month') {
      dateFilter = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
  }

  const where = dateFilter ? { createdAt: { gte: dateFilter } } : {};

  const [allRequests, fulfilledRequests] = await Promise.all([
    prisma.bloodRequest.findMany({
      where,
      select: {
        id: true,
        urgency: true,
        status: true,
        requestedAt: true,
        fulfilledAt: true,
        unitsRequired: true,
        unitsFulfilled: true
      }
    }),
    prisma.bloodRequest.findMany({
      where: { ...where, status: 'FULFILLED', fulfilledAt: { not: null } },
      select: {
        urgency: true,
        requestedAt: true,
        fulfilledAt: true
      }
    })
  ]);

  const urgencyTiers = [
    { key: 'CRITICAL_EMERGENCY', label: 'Critical Emergency', color: '#dc2626' },
    { key: 'URGENT', label: 'Urgent', color: '#d97706' },
    { key: 'NORMAL', label: 'Normal', color: '#2563eb' }
  ];

  let totalAll = allRequests.length;
  let fulfilledAll = 0;

  const breakdown = urgencyTiers.map(tier => {
    const matching = allRequests.filter(r => r.urgency === tier.key);
    const total = matching.length;
    const fulfilled = matching.filter(r => r.status === 'FULFILLED').length;
    const pending = matching.filter(r => ['PENDING', 'APPROVED', 'PROCESSING'].includes(r.status)).length;
    const cancelled = matching.filter(r => ['CANCELLED', 'REJECTED'].includes(r.status)).length;
    const rate = total > 0 ? parseFloat(((fulfilled / total) * 100).toFixed(1)) : 100;
    fulfilledAll += fulfilled;

    // Calculate average turnaround in hours
    const fulfilledMatches = fulfilledRequests.filter(r => r.urgency === tier.key && r.fulfilledAt && r.requestedAt);
    let avgHours = 0;
    if (fulfilledMatches.length > 0) {
      const totalHours = fulfilledMatches.reduce((acc, r) => {
        const diffMs = new Date(r.fulfilledAt).getTime() - new Date(r.requestedAt).getTime();
        return acc + Math.max(0, diffMs / (1000 * 60 * 60));
      }, 0);
      avgHours = parseFloat((totalHours / fulfilledMatches.length).toFixed(1));
    } else {
      // Default benchmark averages for demo/cold states
      avgHours = tier.key === 'CRITICAL_EMERGENCY' ? 1.5 : (tier.key === 'URGENT' ? 4.2 : 14.8);
    }

    return {
      urgency: tier.key,
      label: tier.label,
      color: tier.color,
      total,
      fulfilled,
      pending,
      cancelled,
      rate,
      avgTurnaroundHours: avgHours
    };
  });

  const overallRate = totalAll > 0 ? parseFloat(((fulfilledAll / totalAll) * 100).toFixed(1)) : 100;

  res.json({
    success: true,
    data: {
      timeframe: timeframe || 'alltime',
      overallRate,
      totalRequests: totalAll,
      fulfilledRequests: fulfilledAll,
      breakdown
    },
    message: 'Request fulfillment performance metrics fetched successfully'
  });
});

// ==========================================
// 18c. GET /api/admin/stats/geographic
// ==========================================
export const getGeographicStats = asyncHandler(async (req, res) => {
  const [donorsByCity, requestsByLocation, hospitalsByCity] = await Promise.all([
    prisma.donorProfile.groupBy({
      by: ['city'],
      _count: { id: true }
    }),
    prisma.bloodRequest.groupBy({
      by: ['location'],
      _count: { id: true }
    }),
    prisma.hospital.groupBy({
      by: ['city'],
      _count: { id: true }
    })
  ]);

  const cityMap = {};

  donorsByCity.forEach(d => {
    const city = (d.city || 'Other').trim();
    if (!cityMap[city]) cityMap[city] = { city, donors: 0, requests: 0, hospitals: 0 };
    cityMap[city].donors += d._count.id;
  });

  requestsByLocation.forEach(r => {
    const city = (r.location || 'Other').trim();
    if (!cityMap[city]) cityMap[city] = { city, donors: 0, requests: 0, hospitals: 0 };
    cityMap[city].requests += r._count.id;
  });

  hospitalsByCity.forEach(h => {
    const city = (h.city || 'Other').trim();
    if (!cityMap[city]) cityMap[city] = { city, donors: 0, requests: 0, hospitals: 0 };
    cityMap[city].hospitals += h._count.id;
  });

  const regions = Object.values(cityMap).map(item => {
    const balance = item.donors - item.requests;
    let status = 'BALANCED';
    if (balance < 0) status = 'DEFICIT';
    else if (balance > 5) status = 'SURPLUS';

    return {
      ...item,
      balance,
      status
    };
  }).sort((a, b) => (b.donors + b.requests) - (a.donors + a.requests));

  res.json({
    success: true,
    data: {
      totalRegions: regions.length,
      regions
    },
    message: 'Geographic distribution analytics fetched successfully'
  });
});

// ==========================================
// 19. GET /api/admin/profile
// ==========================================
export const getAdminProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true
    }
  });

  if (!user) {
    throw new ApiError(404, 'Admin user not found');
  }

  res.json({
    success: true,
    data: user
  });
});

// ==========================================
// 19. PUT /api/admin/profile
// ==========================================
export const updateAdminProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { name, email, phone } = req.body;

  if (email && email !== req.user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(400, 'Email address is already in use');
    }
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      updatedAt: true
    }
  });

  await createAuditLog({
    userId: req.user.id,
    action: 'UPDATE_ADMIN_PROFILE',
    entity: 'User',
    entityId: req.user.id,
    changes: updateData,
    req
  });

  res.json({
    success: true,
    data: updated,
    message: 'Profile updated successfully'
  });
});

// ==========================================
// 20. PUT /api/admin/change-password
// ==========================================
export const changeAdminPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password are required');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters long');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ApiError(400, 'Incorrect current password');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword }
  });

  await createAuditLog({
    userId: req.user.id,
    action: 'CHANGE_PASSWORD',
    entity: 'User',
    entityId: req.user.id,
    changes: { info: 'Password changed successfully' },
    req
  });

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

// ==========================================
// 21. Notifications Endpoints for Admin
// ==========================================
export const getAdminNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, isRead } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 15));
  const skip = (pageNum - 1) * limitNum;

  const where = {
    OR: [
      { userId: req.user.id },
      { type: 'ADMIN' },
      { type: 'GENERAL' },
      { type: 'EMERGENCY' }
    ]
  };

  if (isRead !== undefined && isRead !== '') {
    where.isRead = isRead === 'true' || isRead === true;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        OR: [
          { userId: req.user.id },
          { type: 'ADMIN' },
          { type: 'GENERAL' },
          { type: 'EMERGENCY' }
        ],
        isRead: false
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

export const markAdminNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() }
  });

  res.json({
    success: true,
    data: notification,
    message: 'Notification marked as read'
  });
});

export const markAllAdminNotificationsRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: {
      OR: [
        { userId: req.user.id },
        { type: 'ADMIN' },
        { type: 'GENERAL' },
        { type: 'EMERGENCY' }
      ],
      isRead: false
    },
    data: { isRead: true, readAt: new Date() }
  });

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

export default {
  getDashboard,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  createAdmin,
  getHospitals,
  verifyHospital,
  getBloodBanks,
  verifyBloodBank,
  getDonors,
  verifyDonor,
  getAuditLogs,
  getStats,
  getSummaryStats,
  exportData,
  getBloodInventoryStats,
  getSignupsStats,
  getRequestTypesStats,
  getFulfillmentStats,
  getGeographicStats,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead
};

