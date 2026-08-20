// backend/src/services/auditService.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Audit Service
 * Handles all audit logging and activity tracking
 */
class AuditService {
  /**
   * Log an audit entry
   * @param {Object} data - Audit data
   * @param {string} data.userId - User ID
   * @param {string} data.action - Action performed
   * @param {string} data.entity - Entity type (User, Hospital, BloodRequest, etc.)
   * @param {string} data.entityId - Entity ID
   * @param {Object} data.changes - Changes made (optional)
   * @param {string} data.ipAddress - IP address (optional)
   * @param {string} data.userAgent - User agent (optional)
   * @returns {Promise<Object>} - Created audit log
   */
  async log(data) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          changes: data.changes || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      return auditLog;
    } catch (error) {
      console.error('Audit log error:', error);
      throw error;
    }
  }

  /**
   * Get audit logs with filters
   * @param {Object} filters - Filter options
   * @param {string} filters.userId - User ID
   * @param {string} filters.action - Action type
   * @param {string} filters.entity - Entity type
   * @param {string} filters.entityId - Entity ID
   * @param {Date} filters.startDate - Start date
   * @param {Date} filters.endDate - End date
   * @param {number} filters.page - Page number
   * @param {number} filters.limit - Items per page
   * @returns {Promise<Object>} - Audit logs with pagination
   */
  async getLogs(filters = {}) {
    try {
      const {
        userId,
        action,
        entity,
        entityId,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = filters;

      const skip = (page - 1) * limit;

      const where = {};
      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (entity) where.entity = entity;
      if (entityId) where.entityId = entityId;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

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
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.auditLog.count({ where })
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get audit logs error:', error);
      throw error;
    }
  }

  /**
   * Get audit log by ID
   * @param {string} id - Audit log ID
   * @returns {Promise<Object>} - Audit log
   */
  async getLogById(id) {
    try {
      const log = await prisma.auditLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      if (!log) {
        throw new Error('Audit log not found');
      }

      return log;
    } catch (error) {
      console.error('Get audit log by ID error:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   * @param {Object} filters - Filter options
   * @param {string} filters.userId - User ID
   * @param {string} filters.entity - Entity type
   * @param {Date} filters.startDate - Start date
   * @param {Date} filters.endDate - End date
   * @returns {Promise<Object>} - Audit statistics
   */
  async getStats(filters = {}) {
    try {
      const { userId, entity, startDate, endDate } = filters;

      const where = {};
      if (userId) where.userId = userId;
      if (entity) where.entity = entity;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [total, byAction, byEntity, byUser, dailyActivity] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.$queryRaw`
          SELECT 
            action,
            COUNT(*) as count
          FROM "AuditLog"
          ${this.buildWhereClause(where)}
          GROUP BY action
          ORDER BY count DESC
          LIMIT 10
        `,
        prisma.$queryRaw`
          SELECT 
            entity,
            COUNT(*) as count
          FROM "AuditLog"
          ${this.buildWhereClause(where)}
          GROUP BY entity
          ORDER BY count DESC
          LIMIT 10
        `,
        prisma.$queryRaw`
          SELECT 
            u.name,
            u.email,
            COUNT(*) as count
          FROM "AuditLog" al
          JOIN "User" u ON al."userId" = u.id
          ${this.buildWhereClause(where)}
          GROUP BY u.id, u.name, u.email
          ORDER BY count DESC
          LIMIT 10
        `,
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('day', "createdAt") as date,
            COUNT(*) as count
          FROM "AuditLog"
          ${this.buildWhereClause(where)}
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY date DESC
          LIMIT 30
        `
      ]);

      return {
        total,
        byAction,
        byEntity,
        byUser,
        dailyActivity
      };
    } catch (error) {
      console.error('Get audit stats error:', error);
      throw error;
    }
  }

  /**
   * Build WHERE clause for raw SQL queries
   * @param {Object} where - Prisma where clause
   * @returns {string} - SQL WHERE clause
   */
  buildWhereClause(where) {
    const conditions = [];
    let paramIndex = 1;

    if (where.userId) {
      conditions.push(`"userId" = $${paramIndex++}`);
    }
    if (where.entity) {
      conditions.push(`entity = $${paramIndex++}`);
    }
    if (where.createdAt) {
      if (where.createdAt.gte) {
        conditions.push(`"createdAt" >= $${paramIndex++}`);
      }
      if (where.createdAt.lte) {
        conditions.push(`"createdAt" <= $${paramIndex++}`);
      }
    }

    if (conditions.length === 0) {
      return '';
    }

    return `WHERE ${conditions.join(' AND ')}`;
  }

  /**
   * Log user login
   * @param {string} userId - User ID
   * @param {Object} req - Request object
   * @returns {Promise<Object>} - Audit log
   */
  async logLogin(userId, req) {
    return this.log({
      userId,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: userId,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']
    });
  }

  /**
   * Log user logout
   * @param {string} userId - User ID
   * @param {Object} req - Request object
   * @returns {Promise<Object>} - Audit log
   */
  async logLogout(userId, req) {
    return this.log({
      userId,
      action: 'USER_LOGOUT',
      entity: 'User',
      entityId: userId,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']
    });
  }

  /**
   * Log user registration
   * @param {string} userId - User ID
   * @param {Object} data - Registration data
   * @param {Object} req - Request object
   * @returns {Promise<Object>} - Audit log
   */
  async logRegistration(userId, data, req) {
    return this.log({
      userId,
      action: 'USER_REGISTER',
      entity: 'User',
      entityId: userId,
      changes: data,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']
    });
  }

  /**
   * Log blood request creation
   * @param {string} userId - User ID
   * @param {string} requestId - Request ID
   * @param {Object} data - Request data
   * @param {Object} req - Request object
   * @returns {Promise<Object>} - Audit log
   */
  async logRequestCreation(userId, requestId, data, req) {
    return this.log({
      userId,
      action: 'CREATE_BLOOD_REQUEST',
      entity: 'BloodRequest',
      entityId: requestId,
      changes: data,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']
    });
  }

  /**
   * Log blood request status update
   * @param {string} userId - User ID
   * @param {string} requestId - Request ID
   * @param {Object} data - Status update data
   * @param {Object} req - Request object
   * @returns {Promise<Object>} - Audit log
   */
  async logRequestStatusUpdate(userId, requestId, data, req) {
    return this.log({
      userId,
      action: 'UPDATE_BLOOD_REQUEST_STATUS',
      entity: 'BloodRequest',
      entityId: requestId,
      changes: data,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']
    });
  }

  /**
   * Log donation recording
   * @param {string} userId - User ID
   * @param {string} donationId - Donation ID
   * @param {Object} data - Donation data
   * @param {Object} req - Request object
   * @returns {Promise<Object>} - Audit log
   */
  async logDonationRecording(userId, donationId, data, req) {
    return this.log({
      userId,
      action: 'RECORD_DONATION',
      entity: 'Donation',
      entityId: donationId,
      changes: data,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']
    });
  }

  /**
   * Log inventory update
   * @param {string} userId - User ID
   * @param {string} inventoryId - Inventory ID
   * @param {Object} data - Inventory data
   * @param {Object} req - Request object
   * @returns {Promise<Object>} - Audit log
   */
  async logInventoryUpdate(userId, inventoryId, data, req) {
    return this.log({
      userId,
      action: 'UPDATE_INVENTORY',
      entity: 'InventoryItem',
      entityId: inventoryId,
      changes: data,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']
    });
  }

  /**
   * Log profile update
   * @param {string} userId - User ID
   * @param {string} entity - Entity type
   * @param {string} entityId - Entity ID
   * @param {Object} data - Profile data
   * @param {Object} req - Request object
   * @returns {Promise<Object>} - Audit log
   */
  async logProfileUpdate(userId, entity, entityId, data, req) {
    return this.log({
      userId,
      action: 'UPDATE_PROFILE',
      entity,
      entityId,
      changes: data,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']
    });
  }

  /**
   * Log verification action
   * @param {string} userId - User ID
   * @param {string} entity - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} status - Verification status
   * @param {Object} req - Request object
   * @returns {Promise<Object>} - Audit log
   */
  async logVerification(userId, entity, entityId, status, req) {
    return this.log({
      userId,
      action: 'VERIFY_ENTITY',
      entity,
      entityId,
      changes: { status },
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']
    });
  }

  /**
   * Log admin action
   * @param {string} userId - User ID
   * @param {string} action - Admin action
   * @param {string} entity - Entity type
   * @param {string} entityId - Entity ID
   * @param {Object} data - Action data
   * @param {Object} req - Request object
   * @returns {Promise<Object>} - Audit log
   */
  async logAdminAction(userId, action, entity, entityId, data, req) {
    return this.log({
      userId,
      action: `ADMIN_${action}`,
      entity,
      entityId,
      changes: data,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']
    });
  }

  /**
   * Get user activity timeline
   * @param {string} userId - User ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} - Activity timeline
   */
  async getUserActivityTimeline(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await prisma.auditLog.findMany({
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      // Group by date
      const timeline = {};
      logs.forEach(log => {
        const date = log.createdAt.toISOString().split('T')[0];
        if (!timeline[date]) {
          timeline[date] = [];
        }
        timeline[date].push({
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          time: log.createdAt
        });
      });

      return timeline;
    } catch (error) {
      console.error('Get user activity timeline error:', error);
      throw error;
    }
  }

  /**
   * Export audit logs
   * @param {Object} filters - Filter options
   * @param {string} format - Export format (csv, json)
   * @returns {Promise<string>} - Exported data
   */
  async exportLogs(filters = {}, format = 'json') {
    try {
      const { logs } = await this.getLogs({ ...filters, limit: 10000 });

      if (format === 'csv') {
        const headers = ['ID', 'User', 'Action', 'Entity', 'EntityId', 'Changes', 'Timestamp', 'IP', 'UserAgent'];
        const rows = logs.map(log => [
          log.id,
          log.user?.name || 'Unknown',
          log.action,
          log.entity,
          log.entityId,
          JSON.stringify(log.changes || {}),
          log.createdAt.toISOString(),
          log.ipAddress || '',
          log.userAgent || ''
        ]);

        return [
          headers.join(','),
          ...rows.map(row => row.join(','))
        ].join('\n');
      }

      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('Export audit logs error:', error);
      throw error;
    }
  }

  /**
   * Clean up old audit logs
   * @param {number} days - Days to keep
   * @returns {Promise<Object>} - Cleanup result
   */
  async cleanupOldLogs(days = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate }
        }
      });

      return {
        deletedCount: result.count,
        message: `Deleted ${result.count} audit logs older than ${days} days`
      };
    } catch (error) {
      console.error('Cleanup old logs error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new AuditService();