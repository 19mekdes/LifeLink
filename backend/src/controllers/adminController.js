import { validationResult } from 'express-validator';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

const serializeData = (data) => {
  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      if (typeof value === 'bigint') {
        return Number(value);
      }
      return value;
    })
  );
};

// ============ DASHBOARD STATISTICS ============
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalDonors,
    totalHospitals,
    totalBloodBanks,
    totalRequests,
    pendingRequests,
    activeRequests,
    fulfilledRequests,
    totalDonations,
    totalNotifications
  ] = await Promise.all([
    prisma.user.count(),
    prisma.donorProfile.count(),
    prisma.hospital.count(),
    prisma.bloodBank.count(),
    prisma.bloodRequest.count(),
    prisma.bloodRequest.count({ where: { status: 'PENDING' } }),
    prisma.bloodRequest.count({ where: { status: { in: ['APPROVED', 'PROCESSING'] } } }),
    prisma.bloodRequest.count({ where: { status: 'FULFILLED' } }),
    prisma.donation.count(),
    prisma.notification.count()
  ]);

  const monthlyRegistrations = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', "createdAt") as month,
      COUNT(*) as total,
      COUNT(CASE WHEN role = 'DONOR' THEN 1 END) as donors,
      COUNT(CASE WHEN role = 'HOSPITAL' THEN 1 END) as hospitals,
      COUNT(CASE WHEN role = 'BLOOD_BANK' THEN 1 END) as blood_banks
    FROM "User"
    WHERE "createdAt" >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month DESC
  `;

  const bloodTypeDistribution = await prisma.$queryRaw`
    SELECT 
      "bloodType" as blood_type,
      COUNT(*) as count
    FROM "DonorProfile"
    GROUP BY "bloodType"
    ORDER BY count DESC
  `;

  const recentActivity = await prisma.auditLog.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  const requestTrends = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', "createdAt") as month,
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'FULFILLED' THEN 1 END) as fulfilled,
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected
    FROM "BloodRequest"
    WHERE "createdAt" >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month DESC
  `;

  const responseData = {
    stats: {
      totalUsers,
      totalDonors,
      totalHospitals,
      totalBloodBanks,
      totalRequests,
      pendingRequests,
      activeRequests,
      fulfilledRequests,
      totalDonations,
      totalNotifications
    },
    monthlyRegistrations: serializeData(monthlyRegistrations),
    bloodTypeDistribution: serializeData(bloodTypeDistribution),
    recentActivity,
    requestTrends: serializeData(requestTrends)
  };

  res.json({
    success: true,
    data: serializeData(responseData)
  });
});

// ============ USER MANAGEMENT ============
export const getUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        donorProfile: true,
        hospital: true,
        bloodBank: true
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);

  const sanitizedUsers = users.map(user => {
    const { password, ...rest } = user;
    return rest;
  });

  const responseData = {
    users: sanitizedUsers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  };

  res.json({
    success: true,
    data: serializeData(responseData)
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
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
    data: serializeData(userWithoutPassword)
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, role, isActive } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { id }
  });

  if (!existingUser) {
    throw new ApiError(404, 'User not found');
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: name || existingUser.name,
      phone: phone || existingUser.phone,
      role: role || existingUser.role,
      isActive: isActive !== undefined ? isActive : existingUser.isActive
    },
    include: {
      donorProfile: true,
      hospital: true,
      bloodBank: true
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: user.id,
      changes: { name, phone, role, isActive }
    }
  });

  const { password, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: serializeData(userWithoutPassword),
    message: 'User updated successfully'
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await prisma.user.delete({
    where: { id }
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: id
    }
  });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// ============ HOSPITAL MANAGEMENT ============
export const getHospitals = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) where.verificationStatus = status;
  if (search) {
    where.OR = [
      { hospitalName: { contains: search, mode: 'insensitive' } },
      { licenseNumber: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } }
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
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.hospital.count({ where })
  ]);

  const responseData = {
    hospitals,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  };

  res.json({
    success: true,
    data: serializeData(responseData)
  });
});

//  verifyHospital function
export const verifyHospital = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status: statusRaw, verificationStatus, notes } = req.body;
  const status = verificationStatus || statusRaw;

  // Check if hospital exists
  const hospital = await prisma.hospital.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!hospital) {
    throw new ApiError(404, 'Hospital not found');
  }

  if (!status || !['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
    throw new ApiError(400, 'Invalid verification status. Must be PENDING, VERIFIED, or REJECTED');
  }

  // Update hospital verification status
  const updatedHospital = await prisma.hospital.update({
    where: { id },
    data: {
      verificationStatus: status,
      verifiedBy: req.user.id,
      verifiedAt: new Date()
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  // Log action
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'VERIFY_HOSPITAL',
      entity: 'Hospital',
      entityId: hospital.id,
      changes: { 
        status, 
        notes: notes || null,
        hospitalName: hospital.user?.name || 'Unknown'
      }
    }
  });

  res.json({
    success: true,
    data: serializeData(updatedHospital),
    message: `Hospital ${hospital.user?.name || 'Unknown'} ${status.toLowerCase()} successfully`
  });
});

// ============ BLOOD BANK MANAGEMENT ============
export const getBloodBanks = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) where.verificationStatus = status;
  if (search) {
    where.OR = [
      { bankName: { contains: search, mode: 'insensitive' } },
      { licenseNumber: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } }
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
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.bloodBank.count({ where })
  ]);

  const responseData = {
    bloodBanks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  };

  res.json({
    success: true,
    data: serializeData(responseData)
  });
});

//  verifyBloodBank function
export const verifyBloodBank = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status: statusRaw, verificationStatus, notes } = req.body;
  const status = verificationStatus || statusRaw;

  // Check if blood bank exists
  const bloodBank = await prisma.bloodBank.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood bank not found');
  }

  if (!status || !['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
    throw new ApiError(400, 'Invalid verification status. Must be PENDING, VERIFIED, or REJECTED');
  }

  // Update blood bank verification status
  const updatedBloodBank = await prisma.bloodBank.update({
    where: { id },
    data: {
      verificationStatus: status
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  // Log action
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'VERIFY_BLOOD_BANK',
      entity: 'BloodBank',
      entityId: bloodBank.id,
      changes: { 
        status, 
        notes: notes || null,
        bankName: bloodBank.user?.name || 'Unknown'
      }
    }
  });

  res.json({
    success: true,
    data: serializeData(updatedBloodBank),
    message: `Blood bank ${bloodBank.user?.name || 'Unknown'} ${status.toLowerCase()} successfully`
  });
});

// ============ DONOR MANAGEMENT ============
export const getDonors = asyncHandler(async (req, res) => {
  const { bloodType, verified, search, page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (bloodType) where.bloodType = bloodType;
  if (verified !== undefined) where.isVerified = verified === 'true';
  if (search) {
    where.OR = [
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { city: { contains: search, mode: 'insensitive' } }
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
            createdAt: true
          }
        },
        _count: {
          select: {
            donations: true
          }
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.donorProfile.count({ where })
  ]);

  const responseData = {
    donors,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  };

  res.json({
    success: true,
    data: serializeData(responseData)
  });
});

//  verifyDonor function
export const verifyDonor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if donor exists
  const existingDonor = await prisma.donorProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  if (!existingDonor) {
    throw new ApiError(404, 'Donor not found');
  }

  // Update donor verification status
  const donor = await prisma.donorProfile.update({
    where: { id },
    data: { isVerified: true },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  // Log action
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'VERIFY_DONOR',
      entity: 'DonorProfile',
      entityId: donor.id,
      changes: { 
        isVerified: true,
        donorName: donor.user?.name || 'Unknown',
        donorEmail: donor.user?.email || 'Unknown'
      }
    }
  });

  res.json({
    success: true,
    data: donor,
    message: `Donor ${donor.user?.name || 'Unknown'} verified successfully`
  });
});

// ============ ADMIN PROFILE ============
export const getAdminProfile = asyncHandler(async (req, res) => {
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        adminProfile: true
      }
    });
  } catch (e) {
    // Fallback if AdminProfile table doesn't exist yet
    user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
  }

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    data: serializeData(user)
  });
});

export const updateAdminProfile = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;

  // Check if email is already taken by another user
  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== req.user.id) {
      throw new ApiError(400, 'Email is already in use by another account');
    }
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone !== undefined && { phone })
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      adminProfile: true
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE_ADMIN_PROFILE',
      entity: 'User',
      entityId: user.id,
      changes: { name, email, phone }
    }
  });

  res.json({
    success: true,
    data: serializeData(user),
    message: 'Admin profile updated successfully'
  });
});

export const changeAdminPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required');
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters long');
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword }
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: req.user.id
    }
  });

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

// ============ ADMIN NOTIFICATIONS ============
export const getAdminNotifications = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit)
  });

  res.json({
    success: true,
    data: serializeData({ notifications })
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }
  if (notification.userId !== req.user.id) {
    throw new ApiError(403, 'Access denied');
  }

  await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() }
  });

  res.json({ success: true, message: 'Notification marked as read' });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true, readAt: new Date() }
  });

  res.json({ success: true, message: 'All notifications marked as read' });
});

// ============ ADMIN REQUESTS (all requests) ============
export const getAdminRequests = asyncHandler(async (req, res) => {
  const { status, urgency, search, page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) where.status = status;
  if (urgency) where.urgency = urgency;
  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { hospital: { hospitalName: { contains: search, mode: 'insensitive' } } },
      { location: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [requests, total] = await Promise.all([
    prisma.bloodRequest.findMany({
      where,
      include: {
        hospital: {
          select: { id: true, hospitalName: true, city: true }
        },
        bloodBank: {
          include: {
            user: { select: { name: true } }
          }
        },
        _count: { select: { donorResponses: true } }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.bloodRequest.count({ where })
  ]);

  res.json({
    success: true,
    data: serializeData({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  });
});

// ============ ADMIN DONATIONS (all donations) ============
export const getAdminDonations = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { donor: { user: { name: { contains: search, mode: 'insensitive' } } } },
      { hospital: { hospitalName: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      include: {
        donor: {
          include: {
            user: { select: { name: true, email: true } }
          }
        },
        hospital: {
          select: { id: true, hospitalName: true }
        },
        request: {
          select: { id: true, bloodType: true }
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.donation.count({ where })
  ]);

  res.json({
    success: true,
    data: serializeData({
      donations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  });
});

// ============ STATS ENDPOINTS ============

// Helper: compute cutoff date from timeframe
function getTimeframeCutoff(timeframe) {
  if (!timeframe || timeframe === 'all' || timeframe === 'alltime') return null;
  const now = new Date();
  if (timeframe === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (timeframe === 'week') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (timeframe === 'month') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

const urgencyColors = {
  CRITICAL_EMERGENCY: '#dc2626',
  URGENT: '#d97706',
  NORMAL: '#2563eb'
};

const urgencyLabels = {
  CRITICAL_EMERGENCY: 'Critical Emergency',
  URGENT: 'Urgent',
  NORMAL: 'Normal'
};

const bloodTypeLabels = {
  A_POS: 'A+', A_NEG: 'A-', B_POS: 'B+', B_NEG: 'B-',
  AB_POS: 'AB+', AB_NEG: 'AB-', O_POS: 'O+', O_NEG: 'O-'
};

export const getRequestTypesStats = asyncHandler(async (req, res) => {
  const { timeframe } = req.query;
  const cutoff = getTimeframeCutoff(timeframe);

  const where = cutoff ? { createdAt: { gte: cutoff } } : {};

  const [total, byUrgency] = await Promise.all([
    prisma.bloodRequest.count({ where }),
    prisma.bloodRequest.groupBy({
      by: ['urgency'],
      where,
      _count: { id: true }
    })
  ]);

  const series = ['CRITICAL_EMERGENCY', 'URGENT', 'NORMAL'].map(key => {
    const found = byUrgency.find(u => u.urgency === key);
    const count = found ? found._count.id : 0;
    return {
      key,
      label: urgencyLabels[key],
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      color: urgencyColors[key]
    };
  });

  res.json({
    success: true,
    data: serializeData({
      timeframe: timeframe || 'all',
      total,
      series
    })
  });
});

export const getBloodInventoryStats = asyncHandler(async (req, res) => {
  const { timeframe } = req.query;
  const cutoff = getTimeframeCutoff(timeframe);

  const categories = Object.values(bloodTypeLabels);
  const bloodTypeKeys = Object.keys(bloodTypeLabels);

  // Get donations per blood type (donated)
  const donationWhere = cutoff ? { donationDate: { gte: cutoff } } : {};
  const donationsByType = await prisma.donation.groupBy({
    by: ['donorId'],
    where: donationWhere,
    _sum: { units: true }
  });

  // Get donor blood types for donated
  const donorIds = donationsByType.map(d => d.donorId);
  const donorProfiles = await prisma.donorProfile.findMany({
    where: { id: { in: donorIds } },
    select: { id: true, bloodType: true }
  });
  const donorTypeMap = Object.fromEntries(donorProfiles.map(d => [d.id, d.bloodType]));

  const donatedMap = {};
  bloodTypeKeys.forEach(k => donatedMap[k] = 0);
  donationsByType.forEach(d => {
    const bt = donorTypeMap[d.donorId];
    if (bt && donatedMap[bt] !== undefined) {
      donatedMap[bt] += d._sum.units || 0;
    }
  });

  // Get fulfilled requests per blood type (issued)
  const fulfilledWhere = cutoff
    ? { status: 'FULFILLED', fulfilledAt: { gte: cutoff } }
    : { status: 'FULFILLED' };
  const issuedByType = await prisma.bloodRequest.groupBy({
    by: ['bloodType'],
    where: fulfilledWhere,
    _sum: { unitsFulfilled: true }
  });
  const issuedMap = {};
  bloodTypeKeys.forEach(k => issuedMap[k] = 0);
  issuedByType.forEach(r => {
    if (issuedMap[r.bloodType] !== undefined) {
      issuedMap[r.bloodType] = r._sum.unitsFulfilled || 0;
    }
  });

  // Get current inventory
  const inventoryItems = await prisma.inventoryItem.findMany({
    select: { bloodType: true, unitsAvailable: true }
  });
  const stockMap = {};
  bloodTypeKeys.forEach(k => stockMap[k] = 0);
  inventoryItems.forEach(item => {
    if (stockMap[item.bloodType] !== undefined) {
      stockMap[item.bloodType] += item.unitsAvailable || 0;
    }
  });

  const series = bloodTypeKeys.map((key, i) => ({
    type: categories[i],
    donated: donatedMap[key] || 0,
    issued: issuedMap[key] || 0,
    inStock: stockMap[key] || 0
  }));

  res.json({
    success: true,
    data: serializeData({ categories, series })
  });
});

export const getSignupsStats = asyncHandler(async (req, res) => {
  const { period } = req.query; // daily, weekly, monthly, yearly

  let labels = [];
  let bbCounts = [];
  let hospCounts = [];
  let donorCounts = [];

  const now = new Date();

  if (period === 'yearly') {
    // Last 4 years
    for (let y = 3; y >= 0; y--) {
      const year = now.getFullYear() - y;
      labels.push(String(year));
      const start = new Date(year, 0, 1);
      const end = new Date(year + 1, 0, 1);
      const [bb, hosp, dnr] = await Promise.all([
        prisma.bloodBank.count({ where: { createdAt: { gte: start, lt: end } } }),
        prisma.hospital.count({ where: { createdAt: { gte: start, lt: end } } }),
        prisma.donorProfile.count({ where: { createdAt: { gte: start, lt: end } } })
      ]);
      bbCounts.push(bb);
      hospCounts.push(hosp);
      donorCounts.push(dnr);
    }
  } else if (period === 'monthly') {
    // Last 12 months
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      labels.push(monthNames[d.getMonth()]);
      const [bb, hosp, dnr] = await Promise.all([
        prisma.bloodBank.count({ where: { createdAt: { gte: d, lt: nextMonth } } }),
        prisma.hospital.count({ where: { createdAt: { gte: d, lt: nextMonth } } }),
        prisma.donorProfile.count({ where: { createdAt: { gte: d, lt: nextMonth } } })
      ]);
      bbCounts.push(bb);
      hospCounts.push(hosp);
      donorCounts.push(dnr);
    }
  } else if (period === 'weekly') {
    // Last 12 weeks
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      labels.push(`W-${w + 1}`);
      const [bb, hosp, dnr] = await Promise.all([
        prisma.bloodBank.count({ where: { createdAt: { gte: weekStart, lt: weekEnd } } }),
        prisma.hospital.count({ where: { createdAt: { gte: weekStart, lt: weekEnd } } }),
        prisma.donorProfile.count({ where: { createdAt: { gte: weekStart, lt: weekEnd } } })
      ]);
      bbCounts.push(bb);
      hospCounts.push(hosp);
      donorCounts.push(dnr);
    }
  } else {
    // daily (default): last 14 days
    for (let d = 13; d >= 0; d--) {
      const day = new Date(now);
      day.setDate(day.getDate() - d);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      labels.push(`${monthNames[day.getMonth()]} ${day.getDate()}`);
      const [bb, hosp, dnr] = await Promise.all([
        prisma.bloodBank.count({ where: { createdAt: { gte: day, lt: nextDay } } }),
        prisma.hospital.count({ where: { createdAt: { gte: day, lt: nextDay } } }),
        prisma.donorProfile.count({ where: { createdAt: { gte: day, lt: nextDay } } })
      ]);
      bbCounts.push(bb);
      hospCounts.push(hosp);
      donorCounts.push(dnr);
    }
  }

  res.json({
    success: true,
    data: serializeData({
      period: period || 'daily',
      labels,
      series: { bloodBanks: bbCounts, hospitals: hospCounts, donors: donorCounts }
    })
  });
});

export const getSummaryStats = asyncHandler(async (req, res) => {
  const [
    totalUsers, activeUsers,
    totalDonors, verifiedDonors,
    totalHospitals, verifiedHospitals,
    totalBloodBanks, verifiedBloodBanks,
    totalBloodRequests, fulfilledRequests,
    totalDonations, completedDonations,
    unitsDonated
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.donorProfile.count(),
    prisma.donorProfile.count({ where: { isVerified: true } }),
    prisma.hospital.count(),
    prisma.hospital.count({ where: { verificationStatus: 'VERIFIED' } }),
    prisma.bloodBank.count(),
    prisma.bloodBank.count({ where: { verificationStatus: 'VERIFIED' } }),
    prisma.bloodRequest.count(),
    prisma.bloodRequest.count({ where: { status: 'FULFILLED' } }),
    prisma.donation.count(),
    prisma.donation.count({ where: { status: 'COMPLETED' } }),
    prisma.donation.aggregate({ _sum: { units: true }, where: { status: 'COMPLETED' } })
  ]);

  const totals = {
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
    totalUnitsDonated: unitsDonated._sum.units || 0
  };

  const summaryTable = [
    { entity: 'Registered Users', total: totalUsers, active: activeUsers, metricLabel: `${activeUsers} Active Accounts`, status: 'Live DB' },
    { entity: 'Donors', total: totalDonors, active: verifiedDonors, metricLabel: `${verifiedDonors} Verified Donors`, status: 'Live DB' },
    { entity: 'Hospitals', total: totalHospitals, active: verifiedHospitals, metricLabel: `${verifiedHospitals} Verified Facilities`, status: 'Live DB' },
    { entity: 'Blood Banks', total: totalBloodBanks, active: verifiedBloodBanks, metricLabel: `${verifiedBloodBanks} Verified Centers`, status: 'Live DB' },
    { entity: 'Blood Requests', total: totalBloodRequests, active: fulfilledRequests, metricLabel: `${fulfilledRequests} Fulfilled Requests`, status: 'Live DB' },
    { entity: 'Donations Recorded', total: totalDonations, active: completedDonations, metricLabel: `${totals.totalUnitsDonated} Units Donated`, status: 'Live DB' }
  ];

  res.json({
    success: true,
    data: serializeData({
      totals,
      summaryTable,
      timestamp: new Date().toISOString()
    })
  });
});

export const getFulfillmentStats = asyncHandler(async (req, res) => {
  const { timeframe } = req.query;
  const cutoff = getTimeframeCutoff(timeframe);

  const where = cutoff ? { createdAt: { gte: cutoff } } : {};

  const [totalRequests, fulfilledRequests, byUrgency] = await Promise.all([
    prisma.bloodRequest.count({ where }),
    prisma.bloodRequest.count({ where: { ...where, status: 'FULFILLED' } }),
    prisma.bloodRequest.groupBy({
      by: ['urgency'],
      where,
      _count: { id: true },
      _sum: { unitsFulfilled: true }
    })
  ]);

  // Get fulfilled + pending + cancelled per urgency
  const statusByUrgency = await prisma.bloodRequest.groupBy({
    by: ['urgency', 'status'],
    where,
    _count: { id: true }
  });

  // Get avg turnaround per urgency (fulfilled only)
  let avgTurnaround;
  if (cutoff) {
    avgTurnaround = await prisma.$queryRaw`
      SELECT 
        "urgency",
        AVG(EXTRACT(EPOCH FROM ("fulfilledAt" - "createdAt"))) / 3600.0 as avg_hours
      FROM "BloodRequest"
      WHERE "status" = 'FULFILLED' AND "fulfilledAt" IS NOT NULL AND "createdAt" >= ${cutoff}
      GROUP BY "urgency"
    `;
  } else {
    avgTurnaround = await prisma.$queryRaw`
      SELECT 
        "urgency",
        AVG(EXTRACT(EPOCH FROM ("fulfilledAt" - "createdAt"))) / 3600.0 as avg_hours
      FROM "BloodRequest"
      WHERE "status" = 'FULFILLED' AND "fulfilledAt" IS NOT NULL
      GROUP BY "urgency"
    `;
  }
  const turnaroundMap = {};
  (avgTurnaround || []).forEach(row => {
    turnaroundMap[row.urgency] = Math.round(Number(row.avg_hours) * 10) / 10;
  });

  const overallRate = totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 1000) / 10 : 0;

  const breakdown = ['CRITICAL_EMERGENCY', 'URGENT', 'NORMAL'].map(key => {
    const urgencyData = statusByUrgency.filter(s => s.urgency === key);
    const total = urgencyData.reduce((sum, u) => sum + u._count.id, 0);
    const fulfilled = (urgencyData.find(u => u.status === 'FULFILLED') || {})._count?.id || 0;
    const pending = (urgencyData.find(u => u.status === 'PENDING') || {})._count?.id || 0;
    const cancelled = (urgencyData.find(u => u.status === 'CANCELLED') || {})._count?.id || 0;
    return {
      urgency: key,
      label: urgencyLabels[key],
      color: urgencyColors[key],
      total,
      fulfilled,
      pending,
      cancelled,
      rate: total > 0 ? Math.round((fulfilled / total) * 1000) / 10 : 0,
      avgTurnaroundHours: turnaroundMap[key] || 0
    };
  });

  res.json({
    success: true,
    data: serializeData({
      timeframe: timeframe || 'all',
      overallRate,
      totalRequests,
      fulfilledRequests,
      breakdown
    })
  });
});

export const getGeographicStats = asyncHandler(async (req, res) => {
  // Get donors by city
  const donorsByCity = await prisma.donorProfile.groupBy({
    by: ['city'],
    _count: { id: true }
  });

  // Get requests by location
  const requestsByLocation = await prisma.bloodRequest.groupBy({
    by: ['location'],
    _count: { id: true }
  });

  // Get hospitals by city
  const hospitalsByCity = await prisma.hospital.groupBy({
    by: ['city'],
    _count: { id: true }
  });

  const cityMap = {};

  donorsByCity.forEach(d => {
    if (!cityMap[d.city]) cityMap[d.city] = { city: d.city, donors: 0, requests: 0, hospitals: 0 };
    cityMap[d.city].donors = d._count.id;
  });

  requestsByLocation.forEach(r => {
    const loc = r.location || 'Unknown';
    if (!cityMap[loc]) cityMap[loc] = { city: loc, donors: 0, requests: 0, hospitals: 0 };
    cityMap[loc].requests = r._count.id;
  });

  hospitalsByCity.forEach(h => {
    if (!cityMap[h.city]) cityMap[h.city] = { city: h.city, donors: 0, requests: 0, hospitals: 0 };
    cityMap[h.city].hospitals = h._count.id;
  });

  const regions = Object.values(cityMap).map(r => ({
    ...r,
    balance: r.donors - r.requests,
    status: r.donors > r.requests ? 'SURPLUS' : r.donors < r.requests ? 'SHORTAGE' : 'BALANCED'
  }));

  regions.sort((a, b) => b.donors - a.donors);

  res.json({
    success: true,
    data: serializeData({
      totalRegions: regions.length,
      regions
    })
  });
});

// ============ SYSTEM MANAGEMENT ============
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { entity, action, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.auditLog.count({ where })
  ]);

  const responseData = {
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  };

  res.json({
    success: true,
    data: serializeData(responseData)
  });
});

export const getSystemStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    totalDonations,
    totalRequests,
    fulfillmentRate,
    avgResponseTime
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.donation.count(),
    prisma.bloodRequest.count(),
    prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'FULFILLED' THEN 1 ELSE 0 END) as fulfilled
      FROM "BloodRequest"
    `,
    prisma.$queryRaw`
      SELECT 
        AVG(EXTRACT(EPOCH FROM ("approvedAt" - "createdAt"))) as avg_seconds
      FROM "BloodRequest"
      WHERE "approvedAt" IS NOT NULL
    `
  ]);

  const rate = fulfillmentRate[0] || { total: 0, fulfilled: 0 };
  const ratePercentage = rate.total > 0 ? (rate.fulfilled / rate.total) * 100 : 0;

  const responseData = {
    totalUsers,
    activeUsers,
    totalDonations,
    totalRequests,
    fulfillmentRate: Math.round(ratePercentage),
    avgResponseTime: Math.round(avgResponseTime[0]?.avg_seconds || 0)
  };

  res.json({
    success: true,
    data: serializeData(responseData)
  });
});

export const createAdmin = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { name, email, password, phone, role, permissions } = req.body;

  if (req.user.role !== 'SUPER_ADMIN') {
    throw new ApiError(403, 'Only SUPER_ADMIN can create admin users');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new ApiError(400, 'User already exists with this email');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      isActive: true,
      adminProfile: {
        create: {
          permissions: permissions || [],
          isActive: true
        }
      }
    },
    include: {
      adminProfile: true
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE_ADMIN',
      entity: 'User',
      entityId: user.id,
      changes: { name, email, role, permissions }
    }
  });

  const { password: _, ...userWithoutPassword } = user;

  res.status(201).json({
    success: true,
    data: serializeData(userWithoutPassword),
    message: 'Admin created successfully'
  });
});

export const exportData = asyncHandler(async (req, res) => {
  const { type } = req.query;

  let data = [];

  switch (type) {
    case 'donors':
      data = await prisma.donorProfile.findMany({
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });
      break;
    case 'hospitals':
      data = await prisma.hospital.findMany({
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
      break;
    case 'donations':
      data = await prisma.donation.findMany({
        include: {
          donor: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          },
          hospital: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });
      break;
    case 'requests':
      data = await prisma.bloodRequest.findMany({
        include: {
          hospital: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });
      break;
    default:
      throw new ApiError(400, 'Invalid export type');
  }

  res.json({
    success: true,
    data: serializeData({
      type,
      count: data.length,
      data
    })
  });
});