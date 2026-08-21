import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
class NotificationService {
  /**
   * Create a notification for a single user
   * @param {Object} data - Notification data
   * @param {string} data.userId - User ID
   * @param {string} data.title - Notification title
   * @param {string} data.message - Notification message
   * @param {string} data.type - Notification type (EMERGENCY, REMINDER, STATUS_UPDATE, GENERAL, SYSTEM)
   * @param {string} data.requestId - Associated request ID (optional)
   * @param {Object} data.data - Additional data (optional)
   * @returns {Promise<Object>} - Created notification
   */
  async createNotification(data) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type || 'GENERAL',
          requestId: data.requestId || null,
          data: data.data || null,
          isRead: false
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          request: true
        }
      });

      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   * @param {Object} data - Notification data
   * @param {string[]} data.userIds - Array of user IDs
   * @param {string} data.title - Notification title
   * @param {string} data.message - Notification message
   * @param {string} data.type - Notification type
   * @param {string} data.requestId - Associated request ID (optional)
   * @param {Object} data.data - Additional data (optional)
   * @returns {Promise<Object>} - Created notifications
   */
  async createBulkNotifications(data) {
    try {
      const notifications = await prisma.$transaction(
        data.userIds.map(userId =>
          prisma.notification.create({
            data: {
              userId,
              title: data.title,
              message: data.message,
              type: data.type || 'GENERAL',
              requestId: data.requestId || null,
              data: data.data || null,
              isRead: false
            }
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Create bulk notifications error:', error);
      throw error;
    }
  }

  /**
   * Send emergency notification to matching donors
   * @param {Object} request - Blood request object
   * @param {Array} donors - Array of donor objects
   * @returns {Promise<Array>} - Created notifications
   */
  async sendEmergencyNotification(request, donors) {
    try {
      const notifications = await prisma.$transaction(
        donors.map(donor =>
          prisma.notification.create({
            data: {
              userId: donor.userId,
              requestId: request.id,
              type: 'EMERGENCY',
              title: `🚨 Emergency Blood Request: ${request.bloodType}`,
              message: `A ${request.urgency.toLowerCase()} request for ${request.unitsRequired} units of ${request.bloodType} blood has been made at ${request.location}. Can you help save a life?`,
              data: {
                requestId: request.id,
                bloodType: request.bloodType,
                unitsRequired: request.unitsRequired,
                location: request.location,
                urgency: request.urgency,
                hospitalName: request.hospital?.hospitalName || 'Unknown Hospital'
              },
              isRead: false
            }
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Send emergency notification error:', error);
      throw error;
    }
  }

  /**
   * Send request status update notification
   * @param {Object} request - Blood request object
   * @param {string} hospitalUserId - Hospital user ID
   * @param {string} status - New status
   * @param {string} notes - Status notes
   * @returns {Promise<Object>} - Created notification
   */
  async sendRequestStatusUpdate(request, hospitalUserId, status, notes = '') {
    try {
      const statusMessages = {
        'APPROVED': '✅ Your blood request has been APPROVED!',
        'PROCESSING': '⏳ Your blood request is being PROCESSED.',
        'FULFILLED': '🎉 Your blood request has been FULFILLED!',
        'REJECTED': '❌ Your blood request has been REJECTED.',
        'CANCELLED': '📝 Your blood request has been CANCELLED.'
      };

      const notification = await prisma.notification.create({
        data: {
          userId: hospitalUserId,
          requestId: request.id,
          type: 'STATUS_UPDATE',
          title: `Request Status: ${status}`,
          message: `${statusMessages[status] || `Status updated to ${status}`} ${notes ? `Notes: ${notes}` : ''}`,
          data: {
            requestId: request.id,
            status,
            notes,
            bloodType: request.bloodType,
            unitsRequired: request.unitsRequired
          },
          isRead: false
        }
      });

      return notification;
    } catch (error) {
      console.error('Send request status update error:', error);
      throw error;
    }
  }

  /**
   * Send donation confirmation notification
   * @param {Object} donation - Donation object
   * @param {string} donorUserId - Donor user ID
   * @returns {Promise<Object>} - Created notification
   */
  async sendDonationConfirmation(donation, donorUserId) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: donorUserId,
          requestId: donation.requestId,
          type: 'STATUS_UPDATE',
          title: 'Thank You for Your Donation! ❤️',
          message: `You have successfully donated ${donation.units} unit(s) of blood. Your contribution can save up to ${donation.units * 3} lives!`,
          data: {
            donationId: donation.id,
            units: donation.units,
            donationDate: donation.donationDate,
            hospitalName: donation.hospital?.hospitalName || 'Unknown Hospital'
          },
          isRead: false
        }
      });

      return notification;
    } catch (error) {
      console.error('Send donation confirmation error:', error);
      throw error;
    }
  }

  /**
   * Send reminder notification for upcoming donation eligibility
   * @param {Object} donor - Donor object
   * @param {Date} eligibleDate - Next eligible date
   * @returns {Promise<Object>} - Created notification
   */
  async sendDonationReminder(donor, eligibleDate) {
    try {
      const daysUntil = Math.ceil((eligibleDate - new Date()) / (1000 * 60 * 60 * 24));

      const notification = await prisma.notification.create({
        data: {
          userId: donor.userId,
          type: 'REMINDER',
          title: '🩸 Donation Reminder',
          message: `You will be eligible to donate blood again in ${daysUntil} days. Your donation can save lives!`,
          data: {
            eligibleDate: eligibleDate,
            daysUntil: daysUntil,
            bloodType: donor.bloodType
          },
          isRead: false
        }
      });

      return notification;
    } catch (error) {
      console.error('Send donation reminder error:', error);
      throw error;
    }
  }

  /**
   * Send welcome notification to new user
   * @param {Object} user - User object
   * @param {string} role - User role
   * @returns {Promise<Object>} - Created notification
   */
  async sendWelcomeNotification(user, role) {
    try {
      const roleMessages = {
        'DONOR': 'Thank you for registering as a blood donor! You can now receive emergency blood requests.',
        'HOSPITAL': 'Welcome to LifeLink! You can now create blood requests and manage your hospital profile.',
        'BLOOD_BANK': 'Welcome! You can now manage blood inventory and process requests.',
        'ADMIN': 'Welcome to the admin dashboard! You have full system access.'
      };

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'GENERAL',
          title: 'Welcome to LifeLink! 🩸',
          message: roleMessages[role] || 'Welcome to LifeLink! Start saving lives today.',
          data: {
            userId: user.id,
            role: role,
            name: user.name
          },
          isRead: false
        }
      });

      return notification;
    } catch (error) {
      console.error('Send welcome notification error:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} - Unread count
   */
  async getUnreadCount(userId) {
    try {
      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      });

      return count;
    } catch (error) {
      console.error('Get unread count error:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for a user with pagination
   * @param {string} userId - User ID
   * @param {Object} options - Pagination options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {boolean} options.isRead - Filter by read status
   * @param {string} options.type - Filter by type
   * @returns {Promise<Object>} - Notifications with pagination
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const { page = 1, limit = 10, isRead, type } = options;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = { userId };
      if (isRead !== undefined) {
        where.isRead = isRead === 'true';
      }
      if (type) {
        where.type = type;
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
                        email: true,
                        phone: true
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

      const unreadCount = await this.getUnreadCount(userId);

      return {
        notifications,
        unreadCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      console.error('Get user notifications error:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for ownership check)
   * @returns {Promise<Object>} - Updated notification
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId: userId
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return notification;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Update result
   */
  async markAllAsRead(userId) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return result;
    } catch (error) {
      console.error('Mark all as read error:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for ownership check)
   * @returns {Promise<Object>} - Deleted notification
   */
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await prisma.notification.delete({
        where: {
          id: notificationId,
          userId: userId
        }
      });

      return notification;
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  }

  /**
   * Delete all read notifications for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Delete result
   */
  async deleteAllReadNotifications(userId) {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          userId,
          isRead: true
        }
      });

      return result;
    } catch (error) {
      console.error('Delete all read notifications error:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Notification statistics
   */
  async getNotificationStats(userId) {
    try {
      const [total, unread, read] = await Promise.all([
        prisma.notification.count({ where: { userId } }),
        prisma.notification.count({ where: { userId, isRead: false } }),
        prisma.notification.count({ where: { userId, isRead: true } })
      ]);

      const byType = await prisma.$queryRaw`
        SELECT 
          type,
          COUNT(*) as count,
          SUM(CASE WHEN "isRead" = false THEN 1 ELSE 0 END) as unread
        FROM "Notification"
        WHERE "userId" = ${userId}
        GROUP BY type
        ORDER BY count DESC
      `;

      return {
        total,
        unread,
        read,
        byType
      };
    } catch (error) {
      console.error('Get notification stats error:', error);
      throw error;
    }
  }
}


export default new NotificationService();