// backend/src/user/donor/donorController.js

import { validationResult } from 'express-validator';
import { ApiError, asyncHandler } from '../../middleware/errorHandler.js';
import prisma from '../../config/database.js';

// ============ GET DONOR PROFILE ============
export const getProfile = asyncHandler(async (req, res) => {
  const donor = await prisma.donorProfile.findUnique({
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

  if (!donor) {
    throw new ApiError(404, 'Donor profile not found');
  }

  res.json({
    success: true,
    data: donor
  });
});

// ============ UPDATE DONOR PROFILE ============
export const updateProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { age, gender, bloodType, address, city, state, country } = req.body;

  const existingDonor = await prisma.donorProfile.findUnique({
    where: { userId: req.user.id }
  });

  if (!existingDonor) {
    throw new ApiError(404, 'Donor profile not found');
  }

  const donor = await prisma.donorProfile.update({
    where: { userId: req.user.id },
    data: {
      age: age ? parseInt(age) : existingDonor.age,
      gender: gender || existingDonor.gender,
      bloodType: bloodType || existingDonor.bloodType,
      address: address || existingDonor.address,
      city: city || existingDonor.city,
      state: state || existingDonor.state,
      country: country || existingDonor.country
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

  res.json({
    success: true,
    data: donor,
    message: 'Profile updated successfully'
  });
});

// ============ UPDATE AVAILABILITY ============
export const updateAvailability = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { availabilityStatus } = req.body;

  const donor = await prisma.donorProfile.update({
    where: { userId: req.user.id },
    data: { availabilityStatus }
  });

  res.json({
    success: true,
    data: donor,
    message: `Availability updated to ${availabilityStatus}`
  });
});

// ============ GET AVAILABLE REQUESTS ============
export const getAvailableRequests = asyncHandler(async (req, res) => {
  const donor = await prisma.donorProfile.findUnique({
    where: { userId: req.user.id }
  });

  if (!donor) {
    throw new ApiError(404, 'Donor profile not found');
  }

  const { urgency, page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    bloodType: donor.bloodType,
    status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
    location: donor.city
  };

  if (urgency) {
    where.urgency = urgency;
  }

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
          where: { donorId: donor.id }
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

  const requestsWithResponse = requests.map(request => {
    const userResponse = request.donorResponses[0]?.response || null;
    return {
      ...request,
      userResponse
    };
  });

  res.json({
    success: true,
    data: {
      requests: requestsWithResponse,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

// ============ RESPOND TO REQUEST ============
export const respondToRequest = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { id } = req.params;
  const { response, message } = req.body;

  const donor = await prisma.donorProfile.findUnique({
    where: { userId: req.user.id }
  });

  if (!donor) {
    throw new ApiError(404, 'Donor profile not found');
  }

  const request = await prisma.bloodRequest.findUnique({
    where: { id }
  });

  if (!request) {
    throw new ApiError(404, 'Blood request not found');
  }

  if (!['PENDING', 'APPROVED', 'PROCESSING'].includes(request.status)) {
    throw new ApiError(400, 'This request is no longer active');
  }

  const donorResponse = await prisma.donorResponse.upsert({
    where: {
      donorId_requestId: {
        donorId: donor.id,
        requestId: id
      }
    },
    update: {
      response,
      message,
      respondedAt: new Date()
    },
    create: {
      donorId: donor.id,
      requestId: id,
      response,
      message
    }
  });

  if (response === 'ACCEPTED') {
    await prisma.donorProfile.update({
      where: { id: donor.id },
      data: {
        reliabilityScore: {
          increment: 2
        }
      }
    });
  }

  res.json({
    success: true,
    data: donorResponse,
    message: `Response recorded: ${response}`
  });
});

// ============ GET DONATION HISTORY ============
export const getDonations = asyncHandler(async (req, res) => {
  const donor = await prisma.donorProfile.findUnique({
    where: { userId: req.user.id }
  });

  if (!donor) {
    throw new ApiError(404, 'Donor profile not found');
  }

  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where: { donorId: donor.id },
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
        },
        bloodBank: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        request: {
          select: {
            bloodType: true,
            unitsRequired: true,
            urgency: true
          }
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { donationDate: 'desc' }
    }),
    prisma.donation.count({ where: { donorId: donor.id } })
  ]);

  res.json({
    success: true,
    data: {
      donations,
      stats: {
        totalDonations: total,
        totalUnits: donations.reduce((sum, d) => sum + d.units, 0)
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

// ============ GET NOTIFICATIONS ============
export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, isRead } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { userId: req.user.id };
  if (isRead !== undefined) {
    where.isRead = isRead === 'true';
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
        request: {
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
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.notification.count({ where })
  ]);

  const unreadCount = await prisma.notification.count({
    where: {
      userId: req.user.id,
      isRead: false
    }
  });

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

// ============ MARK NOTIFICATION AS READ ============
export const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await prisma.notification.update({
    where: {
      id,
      userId: req.user.id
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  res.json({
    success: true,
    data: notification,
    message: 'Notification marked as read'
  });
});

// ============ MARK ALL NOTIFICATIONS AS READ ============
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: {
      userId: req.user.id,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// ============ GET DONOR STATS ============
export const getStats = asyncHandler(async (req, res) => {
  const donor = await prisma.donorProfile.findUnique({
    where: { userId: req.user.id }
  });

  if (!donor) {
    throw new ApiError(404, 'Donor profile not found');
  }

  const [totalDonations, pendingResponses, unreadNotifications] = await Promise.all([
    prisma.donation.count({
      where: { donorId: donor.id }
    }),
    prisma.donorResponse.count({
      where: {
        donorId: donor.id,
        response: 'PENDING'
      }
    }),
    prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false
      }
    })
  ]);

  const lastDonation = await prisma.donation.findFirst({
    where: { donorId: donor.id },
    orderBy: { donationDate: 'desc' },
    select: { donationDate: true }
  });

  const nextEligibleDate = lastDonation
    ? new Date(new Date(lastDonation.donationDate).getTime() + 90 * 24 * 60 * 60 * 1000)
    : null;

  res.json({
    success: true,
    data: {
      totalDonations,
      pendingResponses,
      unreadNotifications,
      lastDonationDate: lastDonation?.donationDate || null,
      nextEligibleDate,
      reliabilityScore: donor.reliabilityScore,
      availabilityStatus: donor.availabilityStatus
    }
  });
});

// ============ GET DONOR DASHBOARD ============
export const getDashboard = asyncHandler(async (req, res) => {
  const donor = await prisma.donorProfile.findUnique({
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

  if (!donor) {
    throw new ApiError(404, 'Donor profile not found');
  }

  const [totalDonations, pendingRequests, unreadNotifications, availableRequests] = await Promise.all([
    prisma.donation.count({
      where: { donorId: donor.id }
    }),
    prisma.bloodRequest.count({
      where: {
        bloodType: donor.bloodType,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
        location: donor.city
      }
    }),
    prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false
      }
    }),
    prisma.bloodRequest.findMany({
      where: {
        bloodType: donor.bloodType,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
        location: donor.city
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
        }
      },
      orderBy: [
        { urgency: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 5
    })
  ]);

  const recentDonations = await prisma.donation.findMany({
    where: { donorId: donor.id },
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
    },
    orderBy: { donationDate: 'desc' },
    take: 5
  });

  const recentNotifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const lastDonation = await prisma.donation.findFirst({
    where: { donorId: donor.id },
    orderBy: { donationDate: 'desc' },
    select: { donationDate: true }
  });

  const nextEligibleDate = lastDonation
    ? new Date(new Date(lastDonation.donationDate).getTime() + 90 * 24 * 60 * 60 * 1000)
    : null;

  res.json({
    success: true,
    data: {
      donor,
      stats: {
        totalDonations,
        pendingRequests,
        unreadNotifications,
        availableRequestsCount: availableRequests.length,
        lastDonationDate: lastDonation?.donationDate || null,
        nextEligibleDate,
        reliabilityScore: donor.reliabilityScore,
        availabilityStatus: donor.availabilityStatus
      },
      availableRequests,
      recentDonations,
      recentNotifications
    }
  });
});

export default {
  getProfile,
  updateProfile,
  updateAvailability,
  getAvailableRequests,
  respondToRequest,
  getDonations,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getStats,
  getDashboard
};
