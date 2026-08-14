import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

// ============ GET DASHBOARD STATS ============
export const getDashboardStats = async (req, res) => {
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { userId: req.user.id }
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital profile not found'
      });
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
        donations: true,
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

    res.json({
      success: true,
      data: {
        stats: {
          totalRequests,
          activeRequests,
          pendingRequests,
          approvedRequests,
          fulfilledRequests,
          cancelledRequests,
          totalDonations
        },
        recentRequests
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

// ============ GET PROFILE ============
export const getProfile = async (req, res) => {
  try {
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
      return res.status(404).json({
        success: false,
        message: 'Hospital profile not found'
      });
    }

    res.json({
      success: true,
      data: hospital
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

// ============ UPDATE PROFILE ============
export const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
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
      return res.status(404).json({
        success: false,
        message: 'Hospital profile not found'
      });
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

    if (req.body.name) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { name: req.body.name }
      });
    }

    res.json({
      success: true,
      data: hospital,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// ============ GET REQUESTS ============
export const getRequests = async (req, res) => {
  try {
    const { status, urgency, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const hospital = await prisma.hospital.findUnique({
      where: { userId: req.user.id }
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
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

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests'
    });
  }
};

// ============ CREATE REQUEST ============
export const createRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
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
      where: { userId: req.user.id }
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    const bloodBank = await prisma.bloodBank.findFirst({
      where: {
        city: hospital.city,
        isActive: true,
        verificationStatus: 'VERIFIED'
      }
    });

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

    res.status(201).json({
      success: true,
      data: request,
      message: 'Blood request created successfully'
    });

  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create blood request'
    });
  }
};

// ============ GET REQUEST BY ID ============
export const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const hospital = await prisma.hospital.findUnique({
      where: { userId: req.user.id }
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
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
        donations: true
      }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.json({
      success: true,
      data: request
    });

  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request'
    });
  }
};

// ============ CANCEL REQUEST ============
export const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const hospital = await prisma.hospital.findUnique({
      where: { userId: req.user.id }
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    const existingRequest = await prisma.bloodRequest.findFirst({
      where: {
        id,
        hospitalId: hospital.id
      }
    });

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Can only cancel PENDING or APPROVED requests
    if (!['PENDING', 'APPROVED'].includes(existingRequest.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel request with status: ${existingRequest.status}`
      });
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

    res.json({
      success: true,
      data: request,
      message: 'Request cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel request'
    });
  }
};

// ============ GET DONATIONS ============
export const getDonations = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const hospital = await prisma.hospital.findUnique({
      where: { userId: req.user.id }
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
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

    res.json({
      success: true,
      data: {
        donations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations'
    });
  }
};

// ============ GET STATS ============
export const getStats = async (req, res) => {
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { userId: req.user.id }
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    // Get monthly counts (last 12 months)
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

    res.json({
      success: true,
      data: {
        monthlyCounts,
        avgResponseTime: avgResponseTime[0]?.avg_seconds || 0,
        fulfillmentRate: fulfillmentRate[0] || { total: 0, fulfilled: 0 }
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};

