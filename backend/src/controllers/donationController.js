import { validationResult } from 'express-validator';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { sendEmail, donationConfirmationEmail, emergencyRequestEmail } from '../services/emailService.js';
import prisma from '../config/database.js';

const DONATION_COOLDOWN_DAYS = 56;

// ============ GET ALL DONATIONS ============
/**
 * @desc    Get all donation records with dynamic filters and pagination
 * @route   GET /api/v1/donations
 * @access  Private (Blood Bank, Hospital, Admin)
 */
export const getAllDonations = asyncHandler(async (req, res) => {
  const {
    status,
    bloodType,
    hospitalId,
    bloodBankId,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = req.query;

  const pageNumber = Math.max(1, parseInt(page, 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNumber - 1) * pageSize;

  const whereClause = {};

  if (status) {
    whereClause.status = status;
  }

  if (hospitalId) {
    whereClause.hospitalId = hospitalId;
  }

  if (bloodBankId) {
    whereClause.bloodBankId = bloodBankId;
  }

  if (bloodType) {
    whereClause.donor = {
      bloodType: bloodType
    };
  }

  if (startDate || endDate) {
    whereClause.donationDate = {};
    if (startDate) {
      whereClause.donationDate.gte = new Date(startDate);
    }
    if (endDate) {
      whereClause.donationDate.lte = new Date(endDate);
    }
  }

  const [totalRecords, donations] = await Promise.all([
    prisma.donation.count({ where: whereClause }),
    prisma.donation.findMany({
      where: whereClause,
      include: {
        donor: {
          include: {
            user: {
              select: { name: true, email: true, phone: true }
            }
          }
        },
        hospital: {
          select: { id: true, hospitalName: true, city: true, phone: true }
        },
        bloodBank: {
          select: { id: true, bankName: true, city: true, phone: true }
        },
        request: {
          select: { id: true, urgency: true, bloodType: true, unitsRequired: true, unitsFulfilled: true }
        }
      },
      orderBy: { donationDate: 'desc' },
      skip,
      take: pageSize
    })
  ]);

  res.status(200).json({
    success: true,
    pagination: {
      totalRecords,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalRecords / pageSize),
      pageSize
    },
    data: donations
  });
});

// ============ GET DONATION BY ID ============
/**
 * @desc    Get donation by ID (with role authorization check)
 * @route   GET /api/v1/donations/:id
 * @access  Private (Donor, Blood Bank, Hospital, Admin)
 */
export const getDonationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const donation = await prisma.donation.findUnique({
    where: { id },
    include: {
      donor: {
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true }
          }
        }
      },
      hospital: {
        select: { id: true, hospitalName: true, city: true, address: true, phone: true }
      },
      bloodBank: {
        select: { id: true, bankName: true, city: true, address: true, phone: true }
      },
      request: {
        select: { id: true, urgency: true, bloodType: true, unitsRequired: true, status: true }
      }
    }
  });

  if (!donation) {
    throw new ApiError(404, 'Donation record not found.');
  }

  // Role-based boundary: Donors can only access their own records
  if (userRole === 'DONOR' && donation.donor.userId !== userId) {
    throw new ApiError(403, 'Unauthorized access to this donation record.');
  }

  res.status(200).json({
    success: true,
    data: donation
  });
});

// ============ GET DONATION CERTIFICATE ============
/**
 * @desc    Get verified donation certificate metadata
 * @route   GET /api/v1/donations/:id/certificate
 * @access  Private (Donor, Blood Bank, Hospital, Admin)
 */
export const getDonationCertificate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const donation = await prisma.donation.findUnique({
    where: { id },
    include: {
      donor: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      bloodBank: {
        select: { bankName: true, licenseNumber: true, city: true }
      },
      hospital: {
        select: { hospitalName: true, city: true }
      }
    }
  });

  if (!donation) {
    throw new ApiError(404, 'Donation record not found.');
  }

  if (userRole === 'DONOR' && donation.donor.userId !== userId) {
    throw new ApiError(403, 'Unauthorized to generate certificate for this donation.');
  }

  if (donation.status !== 'COMPLETED') {
    throw new ApiError(400, 'Certificates can only be generated for COMPLETED donations.');
  }

  const certificatePayload = {
    certificateId: `CERT-${donation.id.toUpperCase()}`,
    donorName: donation.donor.user.name,
    bloodType: donation.donor.bloodType,
    unitsDonated: donation.units,
    donationDate: donation.donationDate,
    issuedBy: donation.bloodBank ? donation.bloodBank.bankName : donation.hospital.hospitalName,
    facilityLicense: donation.bloodBank ? donation.bloodBank.licenseNumber : 'N/A',
    facilityLocation: donation.bloodBank ? donation.bloodBank.city : donation.hospital.city,
    impact: {
      estimatedLivesSaved: donation.units * 3
    },
    verified: true
  };

  res.status(200).json({
    success: true,
    data: certificatePayload
  });
});

// ============ RECORD DONATION ============
/**
 * @desc    Record a completed blood donation (atomic transaction)
 * @route   POST /api/v1/donations
 * @access  Private (Blood Bank, Hospital, Admin)
 */
export const recordDonation = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    donorId,
    hospitalId,
    bloodBankId,
    requestId,
    units = 1,
    notes,
    donationDate
  } = req.body;

  if (!donorId || !hospitalId || !bloodBankId || !requestId) {
    throw new ApiError(400, 'donorId, hospitalId, bloodBankId, and requestId are all required fields.');
  }

  const unitCount = parseInt(units, 10);
  if (isNaN(unitCount) || unitCount <= 0) {
    throw new ApiError(400, 'Units must be a positive integer.');
  }

  const donorProfile = await prisma.donorProfile.findUnique({
    where: { id: donorId },
    include: { 
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      }
    }
  });

  if (!donorProfile) {
    throw new ApiError(404, 'Donor profile not found.');
  }

  const bloodRequest = await prisma.bloodRequest.findUnique({
    where: { id: requestId },
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
    }
  });

  if (!bloodRequest) {
    throw new ApiError(404, 'Associated blood request not found.');
  }

  const executionDate = donationDate ? new Date(donationDate) : new Date();
  const calculatedNextEligibleDate = new Date(
    executionDate.getTime() + DONATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  );

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Donation Record
    const donation = await tx.donation.create({
      data: {
        donorId,
        hospitalId,
        bloodBankId,
        requestId,
        units: unitCount,
        status: 'COMPLETED',
        notes: notes || null,
        recordedBy: req.user.name || req.user.email || userId,
        donationDate: executionDate,
        nextEligibleDate: calculatedNextEligibleDate
      },
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
        request: true
      }
    });

    // 2. Update Donor Profile
    const updatedDonor = await tx.donorProfile.update({
      where: { id: donorId },
      data: {
        lastDonationDate: executionDate,
        nextEligibleDate: calculatedNextEligibleDate,
        totalDonations: { increment: unitCount },
        donationCount: { increment: 1 },
        availabilityStatus: 'TEMPORARILY_UNAVAILABLE',
        reliabilityScore: Math.min(100, donorProfile.reliabilityScore + 5)
      }
    });

    // 3. Update Associated BloodRequest
    const newFulfilledCount = bloodRequest.unitsFulfilled + unitCount;
    const isFullyFulfilled = newFulfilledCount >= bloodRequest.unitsRequired;

    await tx.bloodRequest.update({
      where: { id: requestId },
      data: {
        unitsFulfilled: newFulfilledCount,
        status: isFullyFulfilled ? 'FULFILLED' : 'PROCESSING',
        fulfilledAt: isFullyFulfilled ? new Date() : bloodRequest.fulfilledAt
      }
    });

    // 4. Update Inventory
    await tx.inventoryItem.upsert({
      where: {
        bloodBankId_bloodType: {
          bloodBankId,
          bloodType: donorProfile.bloodType
        }
      },
      update: {
        unitsAvailable: { increment: unitCount }
      },
      create: {
        bloodBankId,
        bloodType: donorProfile.bloodType,
        unitsAvailable: unitCount,
        status: 'AVAILABLE'
      }
    });

    // 5. Create Notification for Donor
    await tx.notification.create({
      data: {
        userId: donorProfile.userId,
        requestId,
        type: 'STATUS_UPDATE',
        title: 'Donation Completed Successfully!',
        message: `Thank you for donating ${unitCount} unit(s) of ${donorProfile.bloodType}. Your contribution can save up to ${unitCount * 3} lives. Next eligible donation date: ${calculatedNextEligibleDate.toDateString()}.`,
        data: {
          donationId: donation.id,
          units: unitCount,
          nextEligibleDate: calculatedNextEligibleDate
        }
      }
    });

    // 6. Audit Log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'RECORD_DONATION_COMPLETED',
        entity: 'Donation',
        entityId: donation.id,
        changes: {
          donorId,
          units: unitCount,
          bloodType: donorProfile.bloodType,
          requestId,
          newReliabilityScore: updatedDonor.reliabilityScore
        }
      }
    });

    return donation;
  });

  // ✅ Send donation confirmation email to donor
  if (donorProfile.user?.email) {
    try {
      const emailTemplate = donationConfirmationEmail(donorProfile.user.name, {
        hospital: { hospitalName: bloodRequest.hospital?.hospitalName || 'Unknown Hospital' },
        request: { bloodType: bloodRequest.bloodType },
        units: unitCount,
        donationDate: executionDate,
        status: 'COMPLETED'
      });
      
      await sendEmail({
        to: donorProfile.user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });
      console.log(`✅ Donation confirmation email sent to ${donorProfile.user.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send donation confirmation email:`, emailError.message);
    }
  }

  // ✅ Send notification to hospital
  if (bloodRequest.hospital?.user?.email) {
    try {
      const subject = `✅ Donation Recorded: ${bloodRequest.bloodType}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f9fafb; }
            .details { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Donation Recorded</h1>
            </div>
            <div class="content">
              <h2>Hello ${bloodRequest.hospital.user.name},</h2>
              <p>A donation has been recorded for your request.</p>
              <div class="details">
                <p><strong>👤 Donor:</strong> ${donorProfile.user.name}</p>
                <p><strong>🩸 Blood Type:</strong> ${bloodRequest.bloodType}</p>
                <p><strong>📦 Units:</strong> ${unitCount}</p>
                <p><strong>📅 Date:</strong> ${executionDate.toLocaleDateString()}</p>
                <p><strong>📋 Request Status:</strong> ${isFullyFulfilled ? '✅ FULFILLED' : '⏳ PROCESSING'}</p>
              </div>
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/hospital-dashboard.html" class="button">View Dashboard</a>
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
        to: bloodRequest.hospital.user.email,
        subject: subject,
        html: html,
      });
      console.log(`✅ Donation notification sent to hospital`);
    } catch (emailError) {
      console.error(`❌ Failed to send donation notification to hospital:`, emailError.message);
    }
  }

  res.status(201).json({
    success: true,
    message: 'Donation successfully recorded and inventory updated.',
    data: result
  });
});

// ============ SCHEDULE DONATION ============
/**
 * @desc    Schedule an upcoming donation appointment
 * @route   POST /api/v1/donations/schedule
 * @access  Private (Donor, Blood Bank, Hospital, Admin)
 */
export const scheduleDonation = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const {
    donorId,
    hospitalId,
    bloodBankId,
    requestId,
    scheduledDate,
    units = 1,
    notes
  } = req.body;

  let targetDonorProfileId = donorId;

  if (userRole === 'DONOR') {
    const myProfile = await prisma.donorProfile.findUnique({
      where: { userId }
    });
    if (!myProfile) {
      throw new ApiError(404, 'Donor profile not found for the logged-in user.');
    }
    targetDonorProfileId = myProfile.id;
  }

  if (!targetDonorProfileId || !hospitalId || !bloodBankId || !requestId || !scheduledDate) {
    throw new ApiError(400, 'donorId, hospitalId, bloodBankId, requestId, and scheduledDate are required.');
  }

  const appointmentDate = new Date(scheduledDate);
  if (isNaN(appointmentDate.getTime()) || appointmentDate < new Date()) {
    throw new ApiError(400, 'Scheduled date must be a valid future timestamp.');
  }

  const profile = await prisma.donorProfile.findUnique({
    where: { id: targetDonorProfileId },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  if (!profile) {
    throw new ApiError(404, 'Target donor profile not found.');
  }

  if (profile.nextEligibleDate && profile.nextEligibleDate > appointmentDate) {
    throw new ApiError(400, `Donor is not eligible on this date. Next eligible date: ${profile.nextEligibleDate.toDateString()}`);
  }

  const donation = await prisma.donation.create({
    data: {
      donorId: targetDonorProfileId,
      hospitalId,
      bloodBankId,
      requestId,
      units: parseInt(units, 10) || 1,
      status: 'SCHEDULED',
      donationDate: appointmentDate,
      notes: notes || null,
      recordedBy: req.user.name || req.user.email || userId
    },
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

  // ✅ Send scheduling confirmation email to donor
  if (profile.user?.email) {
    try {
      const subject = '📅 Donation Appointment Scheduled';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f9fafb; }
            .details { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Donation Appointment Scheduled</h1>
            </div>
            <div class="content">
              <h2>Hello ${profile.user.name},</h2>
              <p>Your donation appointment has been scheduled successfully.</p>
              <div class="details">
                <p><strong>🏥 Hospital:</strong> ${donation.hospital?.hospitalName || 'Unknown Hospital'}</p>
                <p><strong>📅 Date:</strong> ${appointmentDate.toLocaleDateString()}</p>
                <p><strong>⏰ Time:</strong> ${appointmentDate.toLocaleTimeString()}</p>
                <p><strong>📦 Units:</strong> ${donation.units}</p>
              </div>
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/donor-dashboard.html" class="button">View Dashboard</a>
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
        to: profile.user.email,
        subject: subject,
        html: html,
      });
      console.log(`✅ Scheduling email sent to donor`);
    } catch (emailError) {
      console.error(`❌ Failed to send scheduling email:`, emailError.message);
    }
  }

  res.status(201).json({
    success: true,
    message: 'Donation appointment scheduled successfully.',
    data: donation
  });
});

// ============ UPDATE DONATION STATUS ============
/**
 * @desc    Update donation status (e.g. Transition SCHEDULED -> COMPLETED or CANCELLED)
 * @route   PATCH /api/v1/donations/:id/status
 * @access  Private (Blood Bank, Hospital, Admin)
 */
export const updateDonationStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Allowed values: ${validStatuses.join(', ')}`);
  }

  const existingDonation = await prisma.donation.findUnique({
    where: { id },
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
      },
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

  if (!existingDonation) {
    throw new ApiError(404, 'Donation record not found.');
  }

  if (existingDonation.status === status) {
    throw new ApiError(400, `Donation status is already ${status}.`);
  }

  // If transitioning from SCHEDULED -> COMPLETED, execute clinical updates
  if (status === 'COMPLETED' && existingDonation.status !== 'COMPLETED') {
    const completionDate = new Date();
    const nextEligible = new Date(
      completionDate.getTime() + DONATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    );

    const result = await prisma.$transaction(async (tx) => {
      const updatedDonation = await tx.donation.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          notes: notes || existingDonation.notes,
          donationDate: completionDate,
          nextEligibleDate: nextEligible
        }
      });

      await tx.donorProfile.update({
        where: { id: existingDonation.donorId },
        data: {
          lastDonationDate: completionDate,
          nextEligibleDate: nextEligible,
          totalDonations: { increment: existingDonation.units },
          donationCount: { increment: 1 },
          availabilityStatus: 'TEMPORARILY_UNAVAILABLE',
          reliabilityScore: Math.min(100, existingDonation.donor.reliabilityScore + 5)
        }
      });

      const newFulfilled = existingDonation.request.unitsFulfilled + existingDonation.units;
      const isFulfilled = newFulfilled >= existingDonation.request.unitsRequired;

      await tx.bloodRequest.update({
        where: { id: existingDonation.requestId },
        data: {
          unitsFulfilled: newFulfilled,
          status: isFulfilled ? 'FULFILLED' : 'PROCESSING',
          fulfilledAt: isFulfilled ? new Date() : existingDonation.request.fulfilledAt
        }
      });

      await tx.inventoryItem.upsert({
        where: {
          bloodBankId_bloodType: {
            bloodBankId: existingDonation.bloodBankId,
            bloodType: existingDonation.donor.bloodType
          }
        },
        update: {
          unitsAvailable: { increment: existingDonation.units }
        },
        create: {
          bloodBankId: existingDonation.bloodBankId,
          bloodType: existingDonation.donor.bloodType,
          unitsAvailable: existingDonation.units,
          status: 'AVAILABLE'
        }
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE_DONATION_STATUS_COMPLETED',
          entity: 'Donation',
          entityId: id,
          changes: { previousStatus: existingDonation.status, newStatus: 'COMPLETED' }
        }
      });

      return updatedDonation;
    });

    // ✅ Send donation confirmation email to donor
    if (existingDonation.donor?.user?.email) {
      try {
        const emailTemplate = donationConfirmationEmail(existingDonation.donor.user.name, {
          hospital: { hospitalName: existingDonation.hospital?.hospitalName || 'Unknown Hospital' },
          request: { bloodType: existingDonation.request?.bloodType || 'N/A' },
          units: existingDonation.units,
          donationDate: completionDate,
          status: 'COMPLETED'
        });
        
        await sendEmail({
          to: existingDonation.donor.user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });
        console.log(`✅ Donation confirmation email sent to donor`);
      } catch (emailError) {
        console.error(`❌ Failed to send donation confirmation email:`, emailError.message);
      }
    }

    // ✅ Send notification to hospital
    if (existingDonation.request?.hospital?.user?.email) {
      try {
        const subject = `✅ Donation Completed: ${existingDonation.request.bloodType}`;
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 20px; background: #f9fafb; }
              .details { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
              .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Donation Completed</h1>
              </div>
              <div class="content">
                <h2>Hello ${existingDonation.request.hospital.user.name},</h2>
                <p>A scheduled donation has been completed.</p>
                <div class="details">
                  <p><strong>👤 Donor:</strong> ${existingDonation.donor.user.name}</p>
                  <p><strong>🩸 Blood Type:</strong> ${existingDonation.request.bloodType}</p>
                  <p><strong>📦 Units:</strong> ${existingDonation.units}</p>
                  <p><strong>📅 Date:</strong> ${completionDate.toLocaleDateString()}</p>
                </div>
                <p style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/hospital-dashboard.html" class="button">View Dashboard</a>
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
          to: existingDonation.request.hospital.user.email,
          subject: subject,
          html: html,
        });
        console.log(`✅ Completion email sent to hospital`);
      } catch (emailError) {
        console.error(`❌ Failed to send completion email to hospital:`, emailError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Donation marked as COMPLETED and system records updated.',
      data: result
    });
  }

  // Default status update (e.g., CANCELLED)
  const updatedDonation = await prisma.donation.update({
    where: { id },
    data: {
      status,
      notes: notes || existingDonation.notes
    }
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: `UPDATE_DONATION_STATUS_${status}`,
      entity: 'Donation',
      entityId: id,
      changes: { previousStatus: existingDonation.status, newStatus: status }
    }
  });

  // ✅ Send cancellation notification to hospital
  if (status === 'CANCELLED' && existingDonation.request?.hospital?.user?.email) {
    try {
      const subject = `📋 Donation Cancelled: ${existingDonation.request.bloodType}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f9fafb; }
            .details { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Donation Cancelled</h1>
            </div>
            <div class="content">
              <h2>Hello ${existingDonation.request.hospital.user.name},</h2>
              <p>A scheduled donation has been <strong>CANCELLED</strong>.</p>
              <div class="details">
                <p><strong>👤 Donor:</strong> ${existingDonation.donor.user.name}</p>
                <p><strong>🩸 Blood Type:</strong> ${existingDonation.request.bloodType}</p>
                <p><strong>📦 Units:</strong> ${existingDonation.units}</p>
                <p><strong>📝 Reason:</strong> ${notes || 'No reason provided'}</p>
              </div>
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/hospital-dashboard.html" class="button">View Dashboard</a>
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
        to: existingDonation.request.hospital.user.email,
        subject: subject,
        html: html,
      });
      console.log(`✅ Cancellation email sent to hospital`);
    } catch (emailError) {
      console.error(`❌ Failed to send cancellation email:`, emailError.message);
    }
  }

  res.status(200).json({
    success: true,
    message: `Donation status updated to ${status}.`,
    data: updatedDonation
  });
});