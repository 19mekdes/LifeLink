import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();


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

// ============ GET ALL NOTIFICATIONS ============
export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, isRead, type } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { userId: req.user.id };
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
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.notification.count({ where })
  ]);

  // Get unread count
  const unreadCount = await prisma.notification.count({
    where: {
      userId: req.user.id,
      isRead: false
    }
  });

  res.json({
    success: true,
    data: {
      notifications: serializeData(notifications),
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

// ============ GET NOTIFICATION BY ID ============
export const getNotificationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({
    where: {
      id,
      userId: req.user.id
    },
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
      }
    }
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  res.json({
    success: true,
    data: serializeData(notification)
  });
});

// ============ MARK NOTIFICATION AS READ ============
export const markAsRead = asyncHandler(async (req, res) => {
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

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  res.json({
    success: true,
    data: serializeData(notification),
    message: 'Notification marked as read'
  });
});

// ============ MARK ALL NOTIFICATIONS AS READ ============

export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
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
    data: {
      count: result.count
    },
    message: `All ${result.count} notifications marked as read`
  });
});

// ============ MARK NOTIFICATION AS UNREAD ============
export const markAsUnread = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await prisma.notification.update({
    where: {
      id,
      userId: req.user.id
    },
    data: {
      isRead: false,
      readAt: null
    }
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  res.json({
    success: true,
    data: serializeData(notification),
    message: 'Notification marked as unread'
  });
});

// ============ DELETE NOTIFICATION ============

export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({
    where: {
      id,
      userId: req.user.id
    }
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  await prisma.notification.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
});

// ============ DELETE ALL READ NOTIFICATIONS ============
export const deleteReadNotifications = asyncHandler(async (req, res) => {
  const result = await prisma.notification.deleteMany({
    where: {
      userId: req.user.id,
      isRead: true
    }
  });

  res.json({
    success: true,
    data: {
      count: result.count
    },
    message: `${result.count} read notifications deleted`
  });
});

// ============ CREATE NOTIFICATION ============
export const createNotification = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { userId, title, message, type, requestId, data } = req.body;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type: type || 'GENERAL',
      requestId: requestId || null,
      data: data || null,
      isRead: false
    },
    include: {
      request: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    data: serializeData(notification),
    message: 'Notification created successfully'
  });
});

// ============ GET NOTIFICATION STATS ============
export const getNotificationStats = asyncHandler(async (req, res) => {
  const [total, unread, read] = await Promise.all([
    prisma.notification.count({
      where: { userId: req.user.id }
    }),
    prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false
      }
    }),
    prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: true
      }
    })
  ]);

  // Get notifications by type
  const byType = await prisma.$queryRaw`
    SELECT 
      type,
      COUNT(*) as count,
      SUM(CASE WHEN "isRead" = false THEN 1 ELSE 0 END) as unread
    FROM "Notification"
    WHERE "userId" = ${req.user.id}
    GROUP BY type
    ORDER BY count DESC
  `;

  res.json({
    success: true,
    data: {
      total,
      unread,
      read,
      byType: serializeData(byType)
    }
  });
});

// ============ GET UNREAD COUNT ============
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await prisma.notification.count({
    where: {
      userId: req.user.id,
      isRead: false
    }
  });

  res.json({
    success: true,
    data: { unreadCount: count }
  });
});

// ============ BULK DELETE NOTIFICATIONS ============
export const bulkDeleteNotifications = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'Notification IDs array is required');
  }

  const result = await prisma.notification.deleteMany({
    where: {
      id: { in: ids },
      userId: req.user.id
    }
  });

  res.json({
    success: true,
    data: {
      deletedCount: result.count
    },
    message: `${result.count} notifications deleted successfully`
  });
});

// ============ SEND SYSTEM NOTIFICATION ============
export const sendSystemNotification = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { title, message, type, roles, data } = req.body;

  // Build where clause for users
  const where = { isActive: true };
  if (roles && roles.length > 0) {
    where.role = { in: roles };
  }

  // Get all users matching the criteria
  const users = await prisma.user.findMany({
    where,
    select: { id: true }
  });

  if (users.length === 0) {
    throw new ApiError(404, 'No users found matching the criteria');
  }

  // Create notifications for all users
  const notifications = await prisma.$transaction(
    users.map(user =>
      prisma.notification.create({
        data: {
          userId: user.id,
          title,
          message,
          type: type || 'SYSTEM',
          data: data || null,
          isRead: false
        }
      })
    )
  );

  res.status(201).json({
    success: true,
    data: {
      total: notifications.length,
      notifications: serializeData(notifications.slice(0, 10)) // Return first 10
    },
    message: `System notification sent to ${notifications.length} users`
  });
});

export default {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  markAsUnread,
  deleteNotification,
  deleteReadNotifications,
  createNotification,
  getNotificationStats,
  getUnreadCount,
  bulkDeleteNotifications,
  sendSystemNotification
};