import { validationResult } from 'express-validator';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
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

// ============ GET HOSPITAL PROFILE ============

export const getProfile = asyncHandler(async (req, res) => {
  const hospital = await prisma.hospital.findUnique({
    where: { userId: req.user.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true
        }
      }
    }
  });

  if (!hospital) {
    throw new ApiError(404, 'Hospital profile not found');
  }

  res.json({
    success: true,
    data: hospital
  });
});

// ============ UPDATE HOSPITAL PROFILE ============

export const updateProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { 
    hospitalName, 
    address, 
    city, 
    state, 
    country, 
    phone, 
    emergencyContact 
  } = req.body;

  const existingHospital = await prisma.hospital.findUnique({
    where: { userId: req.user.id }
  });

  if (!existingHospital) {
    throw new ApiError(404, 'Hospital profile not found');
  }

  const hospital = await prisma.hospital.update({
    where: { userId: req.user.id },
    data: {
      hospitalName: hospitalName || existingHospital.hospitalName,
      address: address || existingHospital.address,
      city: city || existingHospital.city,
      state: state || existingHospital.state,
      country: country || existingHospital.country,
      phone: phone || existingHospital.phone,
      emergencyContact: emergencyContact || existingHospital.emergencyContact
    },
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

  // Update user name if provided
  if (req.body.name) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { name: req.body.name }
    });
  }

  // Log action
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE_HOSPITAL_PROFILE',
      entity: 'Hospital',
      entityId: hospital.id,
      changes: { hospitalName, address, city, phone }
    }
  });

  res.json({
    success: true,
    data: hospital,
    message: 'Profile updated successfully'
  });
});

// ============ GET DASHBOARD STATISTICS ============

export const getDashboardStats = asyncHandler(async (req, res) => {
  const hospital = await prisma.hospital.findUnique({
    where: { userId: req.user.id },
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

  if (!hospital) {
    throw new ApiError(404, 'Hospital not found');
  }

  const [
    totalRequests,
    activeRequests,
    pendingRequests,
    approvedRequests,
    fulfilledRequests,
    cancelledRequests,
    totalDonations
  ] = await Promise.all([
    prisma.bloodRequest.count({ where: { hospitalId: hospital.id } }),
    prisma.bloodRequest.count({ 
      where: { 
        hospitalId: hospital.id,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] }
      }
    }),
    prisma.bloodRequest.count({ 
      where: { 
        hospitalId: hospital.id,
        status: 'PENDING'
      }
    }),
    prisma.bloodRequest.count({ 
      where: { 
        hospitalId: hospital.id,
        status: 'APPROVED'
      }
    }),
    prisma.bloodRequest.count({ 
      where: { 
        hospitalId: hospital.id,
        status: 'FULFILLED'
      }
    }),
    prisma.bloodRequest.count({ 
      where: { 
        hospitalId: hospital.id,
        status: 'CANCELLED'
      }
    }),
    prisma.donation.count({ 
      where: { hospitalId: hospital.id }
    })
  ]);

  // Get recent requests
  const recentRequests = await prisma.bloodRequest.findMany({
    where: { hospitalId: hospital.id },
    include: {
      bloodBank: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      },
      donorResponses: {
        include: {
          donor: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        }
      },
      donations: {
        include: {
          donor: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        }
      },
      _count: {
        select: {
          donorResponses: true,
          donations: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // Get monthly request trends
  const monthlyTrends = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', "createdAt") as month,
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'FULFILLED' THEN 1 END) as fulfilled,
      COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled
    FROM "BloodRequest"
    WHERE "hospitalId" = ${hospital.id}
      AND "createdAt" >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month DESC
  `;

  // Get blood type distribution
  const bloodTypeDistribution = await prisma.$queryRaw`
    SELECT 
      "bloodType",
      COUNT(*) as count
    FROM "BloodRequest"
    WHERE "hospitalId" = ${hospital.id}
    GROUP BY "bloodType"
    ORDER BY count DESC
  `;

  const responseData = {
    stats: {
      totalRequests,
      activeRequests,
      pendingRequests,
      approvedRequests,
      fulfilledRequests,
      cancelledRequests,
      totalDonations
    },
    recentRequests,
    monthlyTrends: serializeData(monthlyTrends),
    bloodTypeDistribution: serializeData(bloodTypeDistribution)
  };

  res.json({
    success: true,
    data: serializeData(responseData)
  });
});

// ============ GET BLOOD REQUESTS ============

export const getRequests = asyncHandler(async (req, res) => {
  const { status, urgency, page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const hospital = await prisma.hospital.findUnique({
    where: { userId: req.user.id }
  });

  if (!hospital) {
    throw new ApiError(404, 'Hospital not found');
  }

  const where = { hospitalId: hospital.id };
  if (status) where.status = status;
  if (urgency) where.urgency = urgency;

  const [requests, total] = await Promise.all([
    prisma.bloodRequest.findMany({
      where,
      include: {
        bloodBank: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        donorResponses: {
          include: {
            donor: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true
                  }
                }
              }
            }
          }
        },
        donations: {
          include: {
            donor: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            donorResponses: true,
            donations: true
          }
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: [
        { urgency: 'desc' },
        { createdAt: 'desc' }
      ]
    }),
    prisma.bloodRequest.count({ where })
  ]);

  const responseData = {
    requests,
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

// ============ CREATE BLOOD REQUEST ============

export const createRequest = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { 
    bloodType, 
    unitsRequired, 
    location, 
    urgency, 
    contactInformation, 
    description, 
    patientInfo 
  } = req.body;

  const hospital = await prisma.hospital.findUnique({
    where: { userId: req.user.id },
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

  if (!hospital) {
    throw new ApiError(404, 'Hospital not found');
  }

  // Find available blood bank in same city
  const bloodBank = await prisma.bloodBank.findFirst({
    where: {
      city: hospital.city,
      isActive: true,
      verificationStatus: 'VERIFIED'
    }
  });

  // Create request
  const request = await prisma.bloodRequest.create({
    data: {
      hospitalId: hospital.id,
      bloodBankId: bloodBank?.id || null,
      bloodType,
      unitsRequired: parseInt(unitsRequired),
      location: location || hospital.city,
      urgency: urgency || 'NORMAL',
      contactInformation: contactInformation || hospital.phone,
      description,
      patientInfo,
      status: 'PENDING',
      statusHistory: [{
        status: 'PENDING',
        timestamp: new Date(),
        notes: 'Request submitted'
      }]
    },
    include: {
      hospital: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      },
      bloodBank: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      }
    }
  });

  // Create notification for blood bank
  if (bloodBank) {
    await prisma.notification.create({
      data: {
        userId: bloodBank.userId,
        requestId: request.id,
        type: 'STATUS_UPDATE',
        title: 'New Blood Request',
        message: `${hospital.hospitalName} has requested ${unitsRequired} units of ${bloodType} blood.`
      }
    });
  }

  // Log action
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE_BLOOD_REQUEST',
      entity: 'BloodRequest',
      entityId: request.id,
      changes: { bloodType, unitsRequired, urgency }
    }
  });

  res.status(201).json({
    success: true,
    data: request,
    message: 'Blood request created successfully'
  });
});

// ============ GET REQUEST BY ID ============

export const getRequestById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const hospital = await prisma.hospital.findUnique({
    where: { userId: req.user.id }
  });

  if (!hospital) {
    throw new ApiError(404, 'Hospital not found');
  }

  const request = await prisma.bloodRequest.findFirst({
    where: {
      id,
      hospitalId: hospital.id
    },
    include: {
      hospital: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      },
      bloodBank: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      },
      donorResponses: {
        include: {
          donor: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        }
      },
      donations: {
        include: {
          donor: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!request) {
    throw new ApiError(404, 'Request not found');
  }

  res.json({
    success: true,
    data: request
  });
});

// ============ CANCEL REQUEST ============

export const cancelRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const hospital = await prisma.hospital.findUnique({
    where: { userId: req.user.id },
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

  if (!hospital) {
    throw new ApiError(404, 'Hospital not found');
  }

  const existingRequest = await prisma.bloodRequest.findFirst({
    where: {
      id,
      hospitalId: hospital.id
    },
    include: {
      bloodBank: {
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!existingRequest) {
    throw new ApiError(404, 'Request not found');
  }

  if (!['PENDING', 'APPROVED'].includes(existingRequest.status)) {
    throw new ApiError(400, `Cannot cancel request with status: ${existingRequest.status}`);
  }

  const request = await prisma.bloodRequest.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      statusHistory: {
        push: {
          status: 'CANCELLED',
          timestamp: new Date(),
          notes: notes || 'Request cancelled by hospital'
        }
      }
    }
  });

  // Notify blood bank
  if (existingRequest.bloodBankId) {
    await prisma.notification.create({
      data: {
        userId: existingRequest.bloodBankId,
        requestId: request.id,
        type: 'STATUS_UPDATE',
        title: 'Request Cancelled',
        message: `Hospital ${hospital.hospitalName} has cancelled their blood request.`
      }
    });
  }

  // Log action
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CANCEL_BLOOD_REQUEST',
      entity: 'BloodRequest',
      entityId: request.id,
      changes: { status: 'CANCELLED', notes }
    }
  });

  res.json({
    success: true,
    data: request,
    message: 'Request cancelled successfully'
  });
});

// ============ GET DONATIONS ============

export const getDonations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const hospital = await prisma.hospital.findUnique({
    where: { userId: req.user.id }
  });

  if (!hospital) {
    throw new ApiError(404, 'Hospital not found');
  }

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where: { hospitalId: hospital.id },
      include: {
        donor: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        bloodBank: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        request: true
      },
      skip,
      take: parseInt(limit),
      orderBy: { donationDate: 'desc' }
    }),
    prisma.donation.count({ where: { hospitalId: hospital.id } })
  ]);

  const responseData = {
    donations,
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

// ============ GET HOSPITAL STATISTICS ============

export const getStats = asyncHandler(async (req, res) => {
  const hospital = await prisma.hospital.findUnique({
    where: { userId: req.user.id }
  });

  if (!hospital) {
    throw new ApiError(404, 'Hospital not found');
  }

  // Get monthly request counts
  const monthlyCounts = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', "createdAt") as month,
      COUNT(*) as total
    FROM "BloodRequest"
    WHERE "hospitalId" = ${hospital.id}
      AND "createdAt" >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month DESC
  `;

  // Get average response time
  const avgResponseTime = await prisma.$queryRaw`
    SELECT 
      AVG(EXTRACT(EPOCH FROM ("approvedAt" - "createdAt"))) as avg_seconds
    FROM "BloodRequest"
    WHERE "hospitalId" = ${hospital.id}
      AND "approvedAt" IS NOT NULL
  `;

  // Get fulfillment rate
  const fulfillmentRate = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'FULFILLED' THEN 1 ELSE 0 END) as fulfilled
    FROM "BloodRequest"
    WHERE "hospitalId" = ${hospital.id}
  `;

  const responseData = {
    monthlyCounts: serializeData(monthlyCounts),
    avgResponseTime: avgResponseTime[0]?.avg_seconds || 0,
    fulfillmentRate: fulfillmentRate[0] || { total: 0, fulfilled: 0 }
  };

  res.json({
    success: true,
    data: serializeData(responseData)
  });
});