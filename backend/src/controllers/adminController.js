import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

  const recentRequests = await prisma.bloodRequest.findMany({
    include: {
      hospital: {
        include: { user: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

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
    metrics: {
      bloodBanks: { total: totalBloodBanks },
      hospitals: { total: totalHospitals, pending: 0 },
      donors: { total: totalDonors, unverified: 0 },
      requests: { total: totalRequests },
      donations: { completed: totalDonations }
    },
    recentRequests: recentRequests,
    recentAuditLogs: recentActivity,
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
  const { status, notes } = req.body;

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
  const { status, notes } = req.body;

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

  // Update blood bank verification status
  const updatedBloodBank = await prisma.bloodBank.update({
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
  const totalFulfill = Number(rate.total || 0);
  const fulfilledCount = Number(rate.fulfilled || 0);
  const ratePercentage = totalFulfill > 0 ? (fulfilledCount / totalFulfill) * 100 : 0;

  const responseData = {
    totalUsers,
    activeUsers,
    totalDonations,
    totalRequests,
    fulfillmentRate: Math.round(ratePercentage),
    avgResponseTime: Math.round(Number(avgResponseTime[0]?.avg_seconds || 0))
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