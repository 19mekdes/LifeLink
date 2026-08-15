const prisma = require('../config/db');

// Standard whole blood donation interval: 56 days (8 weeks)
const DONATION_COOLDOWN_DAYS = 56;

/**
 * @desc    Get all donation records with dynamic filters and pagination
 * @route   GET /api/v1/donations
 * @access  Private (Blood Bank, Hospital, Admin)
 */
exports.getAllDonations = async (req, res) => {
  try {
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

    return res.status(200).json({
      success: true,
      pagination: {
        totalRecords,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalRecords / pageSize),
        pageSize
      },
      data: donations
    });
  } catch (error) {
    console.error('Error in getAllDonations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve donations.'
    });
  }
};

/**
 * @desc    Get donation by ID (with role authorization check)
 * @route   GET /api/v1/donations/:id
 * @access  Private (Donor, Blood Bank, Hospital, Admin)
 */
exports.getDonationById = async (req, res) => {
  try {
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
      return res.status(404).json({
        success: false,
        message: 'Donation record not found.'
      });
    }

    // Role-based boundary: Donors can only access their own records
    if (userRole === 'DONOR' && donation.donor.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this donation record.'
      });
    }

    return res.status(200).json({
      success: true,
      data: donation
    });
  } catch (error) {
    console.error('Error in getDonationById:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve donation record.'
    });
  }
};

/**
 * @desc    Get verified donation certificate metadata
 * @route   GET /api/v1/donations/:id/certificate
 * @access  Private (Donor, Blood Bank, Hospital, Admin)
 */
exports.getDonationCertificate = async (req, res) => {
  try {
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
      return res.status(404).json({
        success: false,
        message: 'Donation record not found.'
      });
    }

    if (userRole === 'DONOR' && donation.donor.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to generate certificate for this donation.'
      });
    }

    if (donation.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Certificates can only be generated for COMPLETED donations.'
      });
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

    return res.status(200).json({
      success: true,
      data: certificatePayload
    });
  } catch (error) {
    console.error('Error in getDonationCertificate:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate certificate data.'
    });
  }
};

/**
 * @desc    Record a completed blood donation (atomic transaction)
 * @route   POST /api/v1/donations
 * @access  Private (Blood Bank, Hospital, Admin)
 */
exports.recordDonation = async (req, res) => {
  try {
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
      return res.status(400).json({
        success: false,
        message: 'donorId, hospitalId, bloodBankId, and requestId are all required fields.'
      });
    }

    const unitCount = parseInt(units, 10);
    if (isNaN(unitCount) || unitCount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Units must be a positive integer.'
      });
    }

    const donorProfile = await prisma.donorProfile.findUnique({
      where: { id: donorId },
      include: { user: true }
    });

    if (!donorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found.'
      });
    }

    const bloodRequest = await prisma.bloodRequest.findUnique({
      where: { id: requestId }
    });

    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Associated blood request not found.'
      });
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
        }
      });

      // 2. Update Donor Profile (Cooldown, stats, availability)
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

      // 3. Update Associated BloodRequest Progress
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

      // 4. Update or Create Blood Bank Inventory
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

      // 5. Notify the Donor
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

      // 6. Record Audit Log
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

    return res.status(201).json({
      success: true,
      message: 'Donation successfully recorded and inventory updated.',
      data: result
    });
  } catch (error) {
    console.error('Error in recordDonation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record donation.'
    });
  }
};

/**
 * @desc    Schedule an upcoming donation appointment
 * @route   POST /api/v1/donations/schedule
 * @access  Private (Donor, Blood Bank, Hospital, Admin)
 */
exports.scheduleDonation = async (req, res) => {
  try {
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

    // If a donor is scheduling for themselves, resolve their profile ID
    if (userRole === 'DONOR') {
      const myProfile = await prisma.donorProfile.findUnique({
        where: { userId }
      });
      if (!myProfile) {
        return res.status(404).json({
          success: false,
          message: 'Donor profile not found for the logged-in user.'
        });
      }
      targetDonorProfileId = myProfile.id;
    }

    if (!targetDonorProfileId || !hospitalId || !bloodBankId || !requestId || !scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'donorId, hospitalId, bloodBankId, requestId, and scheduledDate are required.'
      });
    }

    const appointmentDate = new Date(scheduledDate);
    if (isNaN(appointmentDate.getTime()) || appointmentDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date must be a valid future timestamp.'
      });
    }

    // Verify donor eligibility prior to scheduling
    const profile = await prisma.donorProfile.findUnique({
      where: { id: targetDonorProfileId }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Target donor profile not found.'
      });
    }

    if (profile.nextEligibleDate && profile.nextEligibleDate > appointmentDate) {
      return res.status(400).json({
        success: false,
        message: `Donor is not eligible on this date. Next eligible date: ${profile.nextEligibleDate.toDateString()}`
      });
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
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Donation appointment scheduled successfully.',
      data: donation
    });
  } catch (error) {
    console.error('Error in scheduleDonation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to schedule donation.'
    });
  }
};

/**
 * @desc    Update donation status (e.g. Transition SCHEDULED -> COMPLETED or CANCELLED)
 * @route   PATCH /api/v1/donations/:id/status
 * @access  Private (Blood Bank, Hospital, Admin)
 */
exports.updateDonationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`
      });
    }

    const existingDonation = await prisma.donation.findUnique({
      where: { id },
      include: {
        donor: true,
        request: true
      }
    });

    if (!existingDonation) {
      return res.status(404).json({
        success: false,
        message: 'Donation record not found.'
      });
    }

    if (existingDonation.status === status) {
      return res.status(400).json({
        success: false,
        message: `Donation status is already ${status}.`
      });
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

    return res.status(200).json({
      success: true,
      message: `Donation status updated to ${status}.`,
      data: updatedDonation
    });
  } catch (error) {
    console.error('Error in updateDonationStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update donation status.'
    });
  }
};