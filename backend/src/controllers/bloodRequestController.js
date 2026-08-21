import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { sendEmail, emergencyRequestEmail, requestStatusUpdateEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

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
          { lastDonationDate: {
              lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days
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
      take: 50
    });

    return donors;
  } catch (error) {
    console.error('Find matching donors error:', error);
    return [];
  }
};


const createDonorNotifications = async (donors, request) => {
  try {
    await prisma.$transaction(
      donors.map(donor =>
        prisma.notification.create({
          data: {
            userId: donor.userId,
            requestId: request.id,
            type: 'EMERGENCY',
            title: `🚨 Emergency Blood Request: ${request.bloodType}`,
            message: `A ${request.urgency.toLowerCase().replace('_', ' ')} request for ${request.unitsRequired} units of ${request.bloodType} blood has been made at ${request.location}. Can you help save a life?`
          }
        })
      )
    );
    return true;
  } catch (error) {
    console.error('Create donor notifications error:', error);
    return false;
  }
};

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

  //  Send email notification to blood bank
  if (bloodBank && bloodBank.user?.email) {
    try {
      const subject = `📋 New Blood Request: ${bloodType} from ${hospital.hospitalName}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .details { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 New Blood Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${bloodBank.user.name},</h2>
              <p>A new blood request has been submitted by <strong>${hospital.hospitalName}</strong>.</p>
              <div class="details">
                <p><strong>🩸 Blood Type:</strong> ${bloodType}</p>
                <p><strong>📦 Units Required:</strong> ${unitsRequired}</p>
                <p><strong>🚨 Urgency:</strong> ${urgency}</p>
                <p><strong>📍 Location:</strong> ${location || hospital.city}</p>
                <p><strong>📱 Contact:</strong> ${contactInformation}</p>
                ${description ? `<p><strong>📝 Notes:</strong> ${description}</p>` : ''}
              </div>
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/bloodbank-dashboard.html" class="button">View Request</a>
              </p>
            </div>
            <div class="footer">
              <p>© 2026 LifeLink. Every drop counts.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      await sendEmail({
        to: bloodBank.user.email,
        subject: subject,
        html: html,
      });
      console.log(`✅ Blood bank notification sent to ${bloodBank.user.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send email to blood bank:`, emailError.message);
    }
  }

  //  For CRITICAL_EMERGENCY or URGENT, notify matching donors
  if (urgency === 'CRITICAL_EMERGENCY' || urgency === 'URGENT') {
    const matchingDonors = await findMatchingDonors(request);
    
    if (matchingDonors.length > 0) {
      // Create in-app notifications
      await createDonorNotifications(matchingDonors, request);
      
      // Send email notifications to donors
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
          console.error(`❌ Failed to send email to donor ${donor.user.email}:`, emailError.message);
        }
      }
    }
  }

  //  Create notification for blood bank
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

// ============ GET REQUESTS ============

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

  // ✅ Send email notification to blood bank
  if (existingRequest.bloodBank?.user?.email) {
    try {
      const subject = `📋 Request Cancelled: ${existingRequest.bloodType} from ${hospital.hospitalName}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .details { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Request Cancelled</h1>
            </div>
            <div class="content">
              <h2>Hello ${existingRequest.bloodBank.user.name},</h2>
              <p>The following blood request has been <strong>CANCELLED</strong> by <strong>${hospital.hospitalName}</strong>.</p>
              <div class="details">
                <p><strong>🩸 Blood Type:</strong> ${existingRequest.bloodType}</p>
                <p><strong>📦 Units Required:</strong> ${existingRequest.unitsRequired}</p>
                <p><strong>📋 Reason:</strong> ${notes || 'No reason provided'}</p>
              </div>
            </div>
            <div class="footer">
              <p>© 2026 LifeLink. Every drop counts.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      await sendEmail({
        to: existingRequest.bloodBank.user.email,
        subject: subject,
        html: html,
      });
      console.log(`✅ Cancellation email sent to blood bank`);
    } catch (emailError) {
      console.error(`❌ Failed to send cancellation email:`, emailError.message);
    }
  }

  res.json({
    success: true,
    data: request,
    message: 'Request cancelled successfully'
  });
});

// ============ UPDATE REQUEST STATUS ============

export const updateRequestStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

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

  if (!request) {
    throw new ApiError(404, 'Request not found');
  }

  const updatedRequest = await prisma.bloodRequest.update({
    where: { id },
    data: {
      status,
      statusHistory: {
        push: {
          status,
          timestamp: new Date(),
          notes: notes || `Status updated to ${status}`
        }
      },
      ...(status === 'APPROVED' && { approvedAt: new Date() }),
      ...(status === 'FULFILLED' && { fulfilledAt: new Date() })
    }
  });

  // ✅ Send email notification to hospital
  if (request.hospital?.user?.email) {
    try {
      const emailTemplate = requestStatusUpdateEmail(
        request.hospital.user.name,
        updatedRequest
      );
      await sendEmail({
        to: request.hospital.user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });
      console.log(`✅ Status update email sent to hospital: ${request.hospital.user.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send status update email:`, emailError.message);
    }
  }

  res.json({
    success: true,
    data: updatedRequest,
    message: `Request status updated to ${status}`
  });
});

// ============ RESPOND TO REQUEST (DONOR) ============

export const respondToRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { response, message } = req.body;

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

  // ✅ If donor ACCEPTED, notify hospital
  if (response === 'ACCEPTED' && request.hospital?.user?.email) {
    try {
      const subject = `✅ Donor Responded to Your Request: ${request.bloodType}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .details { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Donor Accepted Your Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${request.hospital.user.name},</h2>
              <p>A donor has <strong>ACCEPTED</strong> your blood request!</p>
              <div class="details">
                <p><strong>👤 Donor:</strong> ${donor.user.name}</p>
                <p><strong>📱 Phone:</strong> ${donor.user.phone}</p>
                <p><strong>📧 Email:</strong> ${donor.user.email}</p>
                <p><strong>🩸 Blood Type:</strong> ${donor.bloodType}</p>
                ${message ? `<p><strong>💬 Message:</strong> ${message}</p>` : ''}
              </div>
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/hospital-dashboard.html" class="button">View Request</a>
              </p>
              <p style="text-align: center; font-size: 14px; color: #6b7280;">
                Please contact the donor to coordinate the donation.
              </p>
            </div>
            <div class="footer">
              <p>© 2026 LifeLink. Every drop counts.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      await sendEmail({
        to: request.hospital.user.email,
        subject: subject,
        html: html,
      });
      console.log(`✅ Donor response email sent to hospital`);
    } catch (emailError) {
      console.error(`❌ Failed to send donor response email:`, emailError.message);
    }
  }

  // Update donor reliability score
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
});

// ============ GET STATISTICS ============

export const getStats = asyncHandler(async (req, res) => {
  const hospital = await prisma.hospital.findUnique({
    where: { userId: req.user.id }
  });

  if (!hospital) {
    throw new ApiError(404, 'Hospital not found');
  }

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

  const avgResponseTime = await prisma.$queryRaw`
    SELECT 
      AVG(EXTRACT(EPOCH FROM ("approvedAt" - "createdAt"))) as avg_seconds
    FROM "BloodRequest"
    WHERE "hospitalId" = ${hospital.id}
      AND "approvedAt" IS NOT NULL
  `;

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
});