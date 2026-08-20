// backend/src/services/auditService.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create an audit log record
 * @param {Object} params
 * @param {string} params.userId - Admin user ID performing the action
 * @param {string} params.action - Action name (e.g. VERIFY_HOSPITAL, CREATE_ADMIN, UPDATE_USER)
 * @param {string} params.entity - Target entity type (e.g. User, Hospital, BloodBank, Donor)
 * @param {string} params.entityId - ID of target entity
 * @param {Object} [params.changes] - Details or diff of the changes made
 * @param {Object} [params.req] - Express request object for IP and User-Agent extraction
 * @returns {Promise<Object>}
 */
export const createAuditLog = async ({
  userId,
  action,
  entity,
  entityId,
  changes = null,
  req = null
}) => {
  try {
    const ipAddress = req
      ? req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null
      : null;
    const userAgent = req ? req.headers['user-agent'] || null : null;

    const log = await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: String(entityId),
        changes: changes ? (typeof changes === 'object' ? changes : { info: changes }) : null,
        ipAddress,
        userAgent
      }
    });

    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Non-blocking for primary operation, but log to error stream
    return null;
  }
};

/**
 * Query audit logs with pagination and filters
 * @param {Object} params
 */
export const getAuditLogs = async ({
  page = 1,
  limit = 20,
  action,
  entity,
  userId,
  search,
  startDate,
  endDate
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (action) {
    where.action = { contains: action, mode: 'insensitive' };
  }

  if (entity) {
    where.entity = { contains: entity, mode: 'insensitive' };
  }

  if (userId) {
    where.userId = userId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { entity: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.auditLog.count({ where })
  ]);

  return {
    logs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
};

export default {
  createAuditLog,
  getAuditLogs
};
