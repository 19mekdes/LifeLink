import { validationResult } from 'express-validator';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { sendEmail, emergencyRequestEmail } from '../services/emailService.js';
import prisma from '../config/database.js';

const convertBigInt = (value) => {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return value;
};

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

// ============ GET BLOOD BANK PROFILE ============

export const getProfile = asyncHandler(async (req, res) => {
  const bloodBank = await prisma.bloodBank.findUnique({
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
      },
      _count: {
        select: {
          inventory: true,
          bloodRequests: true,
          donations: true
        }
      }
    }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank profile not found');
  }

  res.json({
    success: true,
    data: serializeData(bloodBank)
  });
});

// ============ UPDATE BLOOD BANK PROFILE ============

export const updateProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const {
    bankName,
    address,
    city,
    state,
    country,
    phone,
    emergencyContact
  } = req.body;

  const existingBloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!existingBloodBank) {
    throw new ApiError(404, 'Blood Bank profile not found');
  }

  const bloodBank = await prisma.bloodBank.update({
    where: { userId: req.user.id },
    data: {
      bankName: bankName || existingBloodBank.bankName,
      address: address || existingBloodBank.address,
      city: city || existingBloodBank.city,
      state: state || existingBloodBank.state,
      country: country || existingBloodBank.country,
      phone: phone || existingBloodBank.phone,
      emergencyContact: emergencyContact || existingBloodBank.emergencyContact
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

  if (req.body.name) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { name: req.body.name }
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE_BLOOD_BANK_PROFILE',
      entity: 'BloodBank',
      entityId: bloodBank.id,
      changes: { bankName, address, city, phone }
    }
  });

  res.json({
    success: true,
    data: serializeData(bloodBank),
    message: 'Blood Bank profile updated successfully'
  });
});

// ============ GET BLOOD BANK STATISTICS ============

export const getStats = asyncHandler(async (req, res) => {
  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const [
    totalInventory,
    totalRequests,
    pendingRequests,
    fulfilledRequests,
    totalDonations,
    totalUnits
  ] = await Promise.all([
    prisma.inventoryItem.count({
      where: { bloodBankId: bloodBank.id }
    }),
    prisma.bloodRequest.count({
      where: { bloodBankId: bloodBank.id }
    }),
    prisma.bloodRequest.count({
      where: {
        bloodBankId: bloodBank.id,
        status: 'PENDING'
      }
    }),
    prisma.bloodRequest.count({
      where: {
        bloodBankId: bloodBank.id,
        status: 'FULFILLED'
      }
    }),
    prisma.donation.count({
      where: { bloodBankId: bloodBank.id }
    }),
    prisma.inventoryItem.aggregate({
      where: { bloodBankId: bloodBank.id },
      _sum: { unitsAvailable: true }
    })
  ]);

  const totalUnitsAvailable = totalUnits._sum.unitsAvailable
    ? Number(totalUnits._sum.unitsAvailable)
    : 0;

  res.json({
    success: true,
    data: serializeData({
      totalInventory,
      totalRequests,
      pendingRequests,
      fulfilledRequests,
      totalDonations,
      totalUnits: totalUnitsAvailable
    })
  });
});

// ============ GET BLOOD BANK DASHBOARD ============
export const getDashboard = asyncHandler(async (req, res) => {
  const bloodBank = await prisma.bloodBank.findUnique({
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

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  // Get inventory summary
  const inventory = await prisma.inventoryItem.findMany({
    where: { bloodBankId: bloodBank.id },
    orderBy: { bloodType: 'asc' }
  });

  // Get request statistics
  const [
    totalRequests,
    pendingRequests,
    activeRequests,
    fulfilledRequests,
    rejectedRequests,
    totalDonations,
    totalUnits
  ] = await Promise.all([
    prisma.bloodRequest.count({ where: { bloodBankId: bloodBank.id } }),
    prisma.bloodRequest.count({
      where: {
        bloodBankId: bloodBank.id,
        status: 'PENDING'
      }
    }),
    prisma.bloodRequest.count({
      where: {
        bloodBankId: bloodBank.id,
        status: { in: ['APPROVED', 'PROCESSING'] }
      }
    }),
    prisma.bloodRequest.count({
      where: {
        bloodBankId: bloodBank.id,
        status: 'FULFILLED'
      }
    }),
    prisma.bloodRequest.count({
      where: {
        bloodBankId: bloodBank.id,
        status: 'REJECTED'
      }
    }),
    prisma.donation.count({
      where: { bloodBankId: bloodBank.id }
    }),
    prisma.inventoryItem.aggregate({
      where: { bloodBankId: bloodBank.id },
      _sum: { unitsAvailable: true }
    })
  ]);

  // ✅ FIX: Convert BigInt to Number
  const totalUnitsAvailable = totalUnits._sum.unitsAvailable
    ? Number(totalUnits._sum.unitsAvailable)
    : 0;

  // Get low stock items
  const lowStockItems = inventory.filter(
    item => item.unitsAvailable <= item.minStockLevel
  );

  // Get recent requests
  const recentRequests = await prisma.bloodRequest.findMany({
    where: { bloodBankId: bloodBank.id },
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
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected
    FROM "BloodRequest"
    WHERE "bloodBankId" = ${bloodBank.id}
      AND "createdAt" >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month DESC
  `;

  // ✅ FIX: Serialize data to handle BigInt
  const responseData = {
    bloodBank,
    inventory,
    stats: {
      totalRequests,
      pendingRequests,
      activeRequests,
      fulfilledRequests,
      rejectedRequests,
      totalDonations,
      totalUnits: totalUnitsAvailable
    },
    lowStockItems,
    recentRequests,
    monthlyTrends
  };

  // ✅ Serialize the entire response
  res.json({
    success: true,
    data: serializeData(responseData)
  });
});

// ============ GET INVENTORY ============
export const getInventory = asyncHandler(async (req, res) => {
  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const inventory = await prisma.inventoryItem.findMany({
    where: { bloodBankId: bloodBank.id },
    orderBy: { bloodType: 'asc' }
  });

  // ✅ Convert BigInt to Number
  const totalUnits = inventory.reduce((sum, item) => sum + Number(item.unitsAvailable), 0);
  const lowStockItems = inventory.filter(
    item => item.unitsAvailable <= item.minStockLevel
  );
  const outOfStockItems = inventory.filter(
    item => item.unitsAvailable === 0
  );

  const responseData = {
    inventory,
    summary: {
      totalUnits,
      lowStockItems: lowStockItems.length,
      outOfStockItems: outOfStockItems.length,
      bloodTypes: inventory.length
    },
    lowStockItems,
    outOfStockItems
  };

  res.json({
    success: true,
    data: serializeData(responseData)
  });
});

// ============ UPDATE INVENTORY ============
export const updateInventory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { bloodType, unitsAvailable, minStockLevel } = req.body;

  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const inventory = await prisma.inventoryItem.upsert({
    where: {
      bloodBankId_bloodType: {
        bloodBankId: bloodBank.id,
        bloodType: bloodType
      }
    },
    update: {
      unitsAvailable: unitsAvailable !== undefined ? parseInt(unitsAvailable) : undefined,
      minStockLevel: minStockLevel !== undefined ? parseInt(minStockLevel) : undefined,
      status: parseInt(unitsAvailable) > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK'
    },
    create: {
      bloodBankId: bloodBank.id,
      bloodType: bloodType,
      unitsAvailable: parseInt(unitsAvailable) || 0,
      minStockLevel: minStockLevel ? parseInt(minStockLevel) : 5,
      status: parseInt(unitsAvailable) > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK'
    }
  });

  // Log action
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE_INVENTORY',
      entity: 'InventoryItem',
      entityId: inventory.id,
      changes: { bloodType, unitsAvailable, minStockLevel }
    }
  });

  res.json({
    success: true,
    data: serializeData(inventory),
    message: 'Inventory updated successfully'
  });
});

// ============ DELETE INVENTORY ITEM ============
export const deleteInventoryItem = asyncHandler(async (req, res) => {
  const { bloodType } = req.params;

  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const inventory = await prisma.inventoryItem.findUnique({
    where: {
      bloodBankId_bloodType: {
        bloodBankId: bloodBank.id,
        bloodType
      }
    }
  });

  if (!inventory) {
    throw new ApiError(404, 'Inventory item not found');
  }

  if (inventory.unitsReserved > 0) {
    throw new ApiError(400, 'Cannot delete: units are currently reserved for pending requests');
  }

  await prisma.inventoryItem.delete({
    where: { id: inventory.id }
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DELETE_INVENTORY',
      entity: 'InventoryItem',
      entityId: inventory.id,
      changes: { bloodType, deletedUnits: inventory.unitsAvailable }
    }
  });

  res.json({
    success: true,
    message: 'Inventory item deleted successfully'
  });
});
// ============ GET BLOOD REQUESTS ============
export const getRequests = asyncHandler(async (req, res) => {
  const { status, urgency, page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const where = { bloodBankId: bloodBank.id };
  if (status) where.status = status;
  if (urgency) where.urgency = urgency;

  const [requests, total] = await Promise.all([
    prisma.bloodRequest.findMany({
      where,
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
        donations: true,
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

// ============ APPROVE BLOOD REQUEST ============
export const approveRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const request = await prisma.bloodRequest.findUnique({
    where: { id },
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
      donorResponses: {
        include: {
          donor: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });

  if (!request) {
    throw new ApiError(404, 'Request not found');
  }

  if (request.bloodBankId !== bloodBank.id) {
    throw new ApiError(403, 'Access denied to this request');
  }

  if (request.status !== 'PENDING') {
    throw new ApiError(400, `Cannot approve request with status: ${request.status}`);
  }

  // Check inventory
  const inventory = await prisma.inventoryItem.findUnique({
    where: {
      bloodBankId_bloodType: {
        bloodBankId: bloodBank.id,
        bloodType: request.bloodType
      }
    }
  });

  let requiresDonorSupport = false;

  if (!inventory || inventory.unitsAvailable < request.unitsRequired) {
    requiresDonorSupport = true;

    const matchingDonors = await findMatchingDonors(request);

    if (matchingDonors.length > 0) {
      for (const donor of matchingDonors) {
        try {
          const emailTemplate = emergencyRequestEmail(donor.user.name, request);
          await sendEmail({
            to: donor.user.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
          });
          console.log(`✅ Emergency email sent to donor: ${donor.user.email}`);
        } catch (emailError) {
          console.error(`❌ Failed to send email to donor:`, emailError.message);
        }
      }
    }
  }

  const updatedRequest = await prisma.bloodRequest.update({
    where: { id },
    data: {
      status: requiresDonorSupport ? 'PROCESSING' : 'APPROVED',
      approvedAt: new Date(),
      statusHistory: {
        push: {
          status: requiresDonorSupport ? 'PROCESSING' : 'APPROVED',
          timestamp: new Date(),
          notes: notes || (requiresDonorSupport
            ? 'Approved. Donor support requested due to low inventory.'
            : 'Approved by blood bank')
        }
      }
    }
  });

  if (!requiresDonorSupport && inventory) {
    await prisma.inventoryItem.update({
      where: { id: inventory.id },
      data: {
        unitsAvailable: inventory.unitsAvailable - request.unitsRequired,
        unitsReserved: inventory.unitsReserved + request.unitsRequired
      }
    });

    await prisma.bloodRequestAllocation.create({
      data: {
        requestId: request.id,
        inventoryId: inventory.id,
        unitsAllocated: request.unitsRequired
      }
    });
  }

  if (request.hospital?.user?.email) {
    try {
      await sendEmail({
        to: request.hospital.user.email,
        subject: `📋 Request ${requiresDonorSupport ? 'Processing' : 'Approved'}: ${request.bloodType}`,
        html: `...` // Email HTML content
      });
    } catch (emailError) {
      console.error(`❌ Failed to send email to hospital:`, emailError.message);
    }
  }

  res.json({
    success: true,
    data: serializeData(updatedRequest),
    message: requiresDonorSupport
      ? 'Request approved. Donor support requested.'
      : 'Request approved successfully'
  });
});

// ============ REJECT BLOOD REQUEST ============
export const rejectRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const request = await prisma.bloodRequest.findUnique({
    where: { id },
    include: {
      hospital: {
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

  if (!request) {
    throw new ApiError(404, 'Request not found');
  }

  if (request.bloodBankId !== bloodBank.id) {
    throw new ApiError(403, 'Access denied to this request');
  }

  if (request.status !== 'PENDING') {
    throw new ApiError(400, `Cannot reject request with status: ${request.status}`);
  }

  const updatedRequest = await prisma.bloodRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      statusHistory: {
        push: {
          status: 'REJECTED',
          timestamp: new Date(),
          notes: reason || 'Rejected by blood bank'
        }
      }
    }
  });

  if (request.hospital?.user?.email) {
    try {
      await sendEmail({
        to: request.hospital.user.email,
        subject: `📋 Request Rejected: ${request.bloodType}`,
        html: `...` // Email HTML content
      });
    } catch (emailError) {
      console.error(`❌ Failed to send email to hospital:`, emailError.message);
    }
  }

  res.json({
    success: true,
    data: serializeData(updatedRequest),
    message: 'Request rejected successfully'
  });
});

// ============ RECORD DONATION ============
export const recordDonation = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { donorId, requestId, units, notes, donationDate } = req.body;

  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const request = await prisma.bloodRequest.findUnique({
    where: { id: requestId },
    include: {
      hospital: {
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

  if (!request || request.bloodBankId !== bloodBank.id) {
    throw new ApiError(404, 'Request not found or access denied');
  }

  const donor = await prisma.donorProfile.findUnique({
    where: { id: donorId },
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

  if (!donor) {
    throw new ApiError(404, 'Donor not found');
  }

  const executionDate = donationDate ? new Date(donationDate) : new Date();
  const nextEligibleDate = new Date(executionDate.getTime() + 90 * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const donation = await tx.donation.create({
      data: {
        donorId,
        hospitalId: request.hospitalId,
        bloodBankId: bloodBank.id,
        requestId,
        units: parseInt(units),
        donationDate: executionDate,
        status: 'COMPLETED',
        notes,
        recordedBy: req.user.name || req.user.email,
        nextEligibleDate
      }
    });

    await tx.donorProfile.update({
      where: { id: donorId },
      data: {
        lastDonationDate: executionDate,
        totalDonations: { increment: 1 },
        donationCount: { increment: 1 },
        reliabilityScore: { increment: 2 },
        nextEligibleDate
      }
    });

    const newFulfilledCount = request.unitsFulfilled + parseInt(units);
    const isFullyFulfilled = newFulfilledCount >= request.unitsRequired;

    await tx.bloodRequest.update({
      where: { id: requestId },
      data: {
        unitsFulfilled: newFulfilledCount,
        status: isFullyFulfilled ? 'FULFILLED' : 'PROCESSING',
        fulfilledAt: isFullyFulfilled ? new Date() : null
      }
    });

    await tx.inventoryItem.upsert({
      where: {
        bloodBankId_bloodType: {
          bloodBankId: bloodBank.id,
          bloodType: donor.bloodType
        }
      },
      update: {
        unitsAvailable: { increment: parseInt(units) }
      },
      create: {
        bloodBankId: bloodBank.id,
        bloodType: donor.bloodType,
        unitsAvailable: parseInt(units),
        minStockLevel: 5,
        status: 'AVAILABLE'
      }
    });

    return donation;
  });

  if (donor.user?.email) {
    try {
      await sendEmail({
        to: donor.user.email,
        subject: 'Thank You for Your Donation! ❤️',
        html: `...` // Email HTML content
      });
    } catch (emailError) {
      console.error(`❌ Failed to send email to donor:`, emailError.message);
    }
  }

  res.status(201).json({
    success: true,
    data: serializeData(result),
    message: 'Donation recorded successfully'
  });
});

// ============ HELPER FUNCTIONS ============

const findMatchingDonors = async (request) => {
  try {
    const donors = await prisma.donorProfile.findMany({
      where: {
        bloodType: request.bloodType,
        availabilityStatus: 'AVAILABLE',
        isVerified: true,
        city: request.location,
        OR: [
          { lastDonationDate: null },
          {
            lastDonationDate: {
              lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: [
        { reliabilityScore: 'desc' },
        { lastDonationDate: 'asc' }
      ],
      take: 50
    });

    return donors;
  } catch (error) {
    console.error('Find matching donors error:', error);
    return [];
  }
};