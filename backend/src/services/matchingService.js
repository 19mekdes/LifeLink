// backend/src/services/matchingService.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Matching Service
 * Handles all donor matching and compatibility logic
 */
class MatchingService {
  /**
   * Find matching donors for a blood request
   * @param {Object} request - Blood request object
   * @param {Object} options - Matching options
   * @param {number} options.limit - Maximum number of donors to return
   * @param {boolean} options.includeUnverified - Include unverified donors
   * @returns {Promise<Array>} - Array of matching donors
   */
  async findMatchingDonors(request, options = {}) {
    try {
      const { limit = 50, includeUnverified = false } = options;

      const where = {
        bloodType: request.bloodType,
        availabilityStatus: 'AVAILABLE',
        city: request.location
      };

      if (!includeUnverified) {
        where.isVerified = true;
      }

      // Donors must be eligible (90-day rule)
      const donors = await prisma.donorProfile.findMany({
        where: {
          ...where,
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
              phone: true,
              createdAt: true
            }
          }
        },
        orderBy: [
          { reliabilityScore: 'desc' },
          { lastDonationDate: 'asc' }
        ],
        take: limit
      });

      // Calculate match score for each donor
      const matchedDonors = donors.map(donor => ({
        ...donor,
        matchScore: this.calculateMatchScore(donor, request)
      }));

      // Sort by match score (highest first)
      matchedDonors.sort((a, b) => b.matchScore - a.matchScore);

      return matchedDonors;
    } catch (error) {
      console.error('Find matching donors error:', error);
      throw error;
    }
  }

  /**
   * Calculate match score for a donor
   * @param {Object} donor - Donor profile
   * @param {Object} request - Blood request
   * @returns {number} - Match score (0-100)
   */
  calculateMatchScore(donor, request) {
    let score = 0;

    // Blood type match (30 points)
    if (donor.bloodType === request.bloodType) {
      score += 30;
    }

    // Location match (20 points)
    if (donor.city.toLowerCase() === request.location.toLowerCase()) {
      score += 20;
    }

    // Reliability score (20 points - scaled)
    score += (donor.reliabilityScore / 100) * 20;

    // Last donation date (15 points)
    if (!donor.lastDonationDate) {
      score += 15;
    } else {
      const daysSinceDonation = Math.floor(
        (Date.now() - new Date(donor.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      // More points for longer since last donation
      score += Math.min(15, (daysSinceDonation / 90) * 15);
    }

    // Donation count (15 points)
    // Donors who have donated before are more reliable
    if (donor.totalDonations > 0) {
      score += Math.min(15, donor.totalDonations * 2);
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Find compatible blood types (universal donor/recipient)
   * @param {string} bloodType - Blood type
   * @returns {Object} - Compatible blood types
   */
  getCompatibleBloodTypes(bloodType) {
    const compatibility = {
      'O_POS': {
        canReceiveFrom: ['O_POS', 'O_NEG'],
        canDonateTo: ['O_POS', 'A_POS', 'B_POS', 'AB_POS']
      },
      'O_NEG': {
        canReceiveFrom: ['O_NEG'],
        canDonateTo: ['O_POS', 'O_NEG', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG']
      },
      'A_POS': {
        canReceiveFrom: ['A_POS', 'A_NEG', 'O_POS', 'O_NEG'],
        canDonateTo: ['A_POS', 'AB_POS']
      },
      'A_NEG': {
        canReceiveFrom: ['A_NEG', 'O_NEG'],
        canDonateTo: ['A_POS', 'A_NEG', 'AB_POS', 'AB_NEG']
      },
      'B_POS': {
        canReceiveFrom: ['B_POS', 'B_NEG', 'O_POS', 'O_NEG'],
        canDonateTo: ['B_POS', 'AB_POS']
      },
      'B_NEG': {
        canReceiveFrom: ['B_NEG', 'O_NEG'],
        canDonateTo: ['B_POS', 'B_NEG', 'AB_POS', 'AB_NEG']
      },
      'AB_POS': {
        canReceiveFrom: ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'],
        canDonateTo: ['AB_POS']
      },
      'AB_NEG': {
        canReceiveFrom: ['A_NEG', 'B_NEG', 'AB_NEG', 'O_NEG'],
        canDonateTo: ['AB_POS', 'AB_NEG']
      }
    };

    return compatibility[bloodType] || {
      canReceiveFrom: [],
      canDonateTo: []
    };
  }

  /**
   * Find donors with compatible blood types (if exact match not available)
   * @param {Object} request - Blood request
   * @param {number} limit - Maximum number of donors
   * @returns {Promise<Array>} - Array of compatible donors
   */
  async findCompatibleDonors(request, limit = 50) {
    try {
      const compatibility = this.getCompatibleBloodTypes(request.bloodType);
      const compatibleTypes = compatibility.canDonateTo || [];

      // If exact match is available, prioritize it
      const exactMatch = await this.findMatchingDonors(request, { limit: 10 });

      if (exactMatch.length > 0) {
        return exactMatch;
      }

      // Find compatible donors
      const compatibleDonors = await prisma.donorProfile.findMany({
        where: {
          bloodType: { in: compatibleTypes },
          availabilityStatus: 'AVAILABLE',
          isVerified: true,
          OR: [
            { lastDonationDate: null },
            { lastDonationDate: {
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
              phone: true,
              createdAt: true
            }
          }
        },
        orderBy: [
          { reliabilityScore: 'desc' },
          { lastDonationDate: 'asc' }
        ],
        take: limit
      });

      return compatibleDonors;
    } catch (error) {
      console.error('Find compatible donors error:', error);
      throw error;
    }
  }

  /**
   * Check if a donor is eligible to donate
   * @param {Object} donor - Donor profile
   * @param {Date} date - Date to check (default: now)
   * @returns {Object} - Eligibility result
   */
  checkDonorEligibility(donor, date = new Date()) {
    const result = {
      eligible: true,
      reasons: [],
      nextEligibleDate: null
    };

    // Check age
    if (donor.age < 16) {
      result.eligible = false;
      result.reasons.push('Donor must be at least 16 years old');
    }

    if (donor.age > 70) {
      result.eligible = false;
      result.reasons.push('Donor must be under 70 years old');
    }

    // Check last donation date (90-day rule)
    if (donor.lastDonationDate) {
      const daysSinceDonation = Math.floor(
        (Date.now() - new Date(donor.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceDonation < 90) {
        result.eligible = false;
        result.reasons.push(`Last donation was ${daysSinceDonation} days ago. Minimum 90 days required.`);
        result.nextEligibleDate = new Date(
          new Date(donor.lastDonationDate).getTime() + 90 * 24 * 60 * 60 * 1000
        );
      }
    }

    // Check availability status
    if (donor.availabilityStatus !== 'AVAILABLE') {
      result.eligible = false;
      result.reasons.push(`Donor is currently ${donor.availabilityStatus.toLowerCase()}`);
    }

    // Check verification status
    if (!donor.isVerified) {
      result.eligible = false;
      result.reasons.push('Donor is not verified');
    }

    return result;
  }

  /**
   * Get donors by urgency level
   * @param {Object} request - Blood request
   * @param {string} urgency - Urgency level
   * @returns {Promise<Array>} - Array of donors
   */
  async getDonorsByUrgency(request, urgency) {
    try {
      let limit = 50;
      let includeUnverified = false;

      if (urgency === 'CRITICAL_EMERGENCY') {
        limit = 100;
        includeUnverified = true;
      } else if (urgency === 'URGENT') {
        limit = 75;
        includeUnverified = false;
      } else {
        limit = 50;
        includeUnverified = false;
      }

      return this.findMatchingDonors(request, { limit, includeUnverified });
    } catch (error) {
      console.error('Get donors by urgency error:', error);
      throw error;
    }
  }

  /**
   * Get donor statistics for a specific blood type
   * @param {string} bloodType - Blood type
   * @param {string} city - City (optional)
   * @returns {Promise<Object>} - Donor statistics
   */
  async getDonorStatistics(bloodType, city = null) {
    try {
      const where = {
        bloodType,
        isVerified: true,
        availabilityStatus: 'AVAILABLE'
      };

      if (city) {
        where.city = city;
      }

      const [total, eligible, averageReliability] = await Promise.all([
        prisma.donorProfile.count({ where }),
        prisma.donorProfile.count({
          where: {
            ...where,
            OR: [
              { lastDonationDate: null },
              { lastDonationDate: {
                  lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                }
              }
            ]
          }
        }),
        prisma.donorProfile.aggregate({
          where,
          _avg: { reliabilityScore: true }
        })
      ]);

      return {
        bloodType,
        city,
        totalDonors: total,
        eligibleDonors: eligible,
        averageReliability: Math.round(averageReliability._avg.reliabilityScore || 0),
        availabilityPercentage: total > 0 ? Math.round((eligible / total) * 100) : 0
      };
    } catch (error) {
      console.error('Get donor statistics error:', error);
      throw error;
    }
  }

  /**
   * Get all donors with filters
   * @param {Object} filters - Filter options
   * @param {string} filters.bloodType - Blood type
   * @param {string} filters.city - City
   * @param {string} filters.availabilityStatus - Availability status
   * @param {boolean} filters.isVerified - Verification status
   * @param {number} filters.minReliability - Minimum reliability score
   * @param {number} filters.page - Page number
   * @param {number} filters.limit - Items per page
   * @returns {Promise<Object>} - Donors with pagination
   */
  async getDonorsWithFilters(filters = {}) {
    try {
      const {
        bloodType,
        city,
        availabilityStatus,
        isVerified,
        minReliability,
        page = 1,
        limit = 20
      } = filters;

      const skip = (page - 1) * limit;

      const where = {};
      if (bloodType) where.bloodType = bloodType;
      if (city) where.city = city;
      if (availabilityStatus) where.availabilityStatus = availabilityStatus;
      if (isVerified !== undefined) where.isVerified = isVerified;
      if (minReliability) where.reliabilityScore = { gte: minReliability };

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
            }
          },
          skip,
          take: limit,
          orderBy: { reliabilityScore: 'desc' }
        }),
        prisma.donorProfile.count({ where })
      ]);

      return {
        donors,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get donors with filters error:', error);
      throw error;
    }
  }

  /**
   * Get emergency response statistics
   * @param {string} bloodBankId - Blood bank ID (optional)
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} - Emergency response statistics
   */
  async getEmergencyResponseStats(bloodBankId = null, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where = {
        urgency: 'CRITICAL_EMERGENCY',
        createdAt: { gte: startDate }
      };

      if (bloodBankId) {
        where.bloodBankId = bloodBankId;
      }

      const requests = await prisma.bloodRequest.findMany({
        where,
        include: {
          donorResponses: true,
          donations: true
        }
      });

      const totalRequests = requests.length;
      const totalResponses = requests.reduce((sum, r) => sum + r.donorResponses.length, 0);
      const totalDonations = requests.reduce((sum, r) => sum + r.donations.length, 0);
      const fulfilledRequests = requests.filter(r => r.status === 'FULFILLED').length;

      // Average response time
      const avgResponseTime = requests.reduce((sum, r) => {
        const firstResponse = r.donorResponses[0];
        if (firstResponse) {
          const timeDiff = new Date(firstResponse.respondedAt) - new Date(r.createdAt);
          return sum + timeDiff / (1000 * 60); // minutes
        }
        return sum;
      }, 0) / (totalResponses || 1);

      return {
        period: `${days} days`,
        totalEmergencyRequests: totalRequests,
        totalDonorResponses: totalResponses,
        totalDonations: totalDonations,
        fulfilledRequests: fulfilledRequests,
        fulfillmentRate: totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 100) : 0,
        averageResponseTimeMinutes: Math.round(avgResponseTime)
      };
    } catch (error) {
      console.error('Get emergency response stats error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new MatchingService();