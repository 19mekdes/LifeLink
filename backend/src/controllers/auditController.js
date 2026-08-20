import { validationResult } from 'express-validator';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import auditService from '../services/auditService.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    userId,
    action,
    entity,
    entityId,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = req.query;

  const filters = {
    userId,
    action,
    entity,
    entityId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100)
  };

  const result = await auditService.getLogs(filters);

  res.json({
    success: true,
    data: result
  });
});

export const getAuditLogById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const log = await auditService.getLogById(id);

  res.json({
    success: true,
    data: log
  });
});


export const getAuditStats = asyncHandler(async (req, res) => {
  const {
    userId,
    entity,
    startDate,
    endDate
  } = req.query;

  const filters = {
    userId,
    entity,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined
  };

  const stats = await auditService.getStats(filters);

  res.json({
    success: true,
    data: stats
  });
});


export const getUserActivityTimeline = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { days = 30 } = req.query;

  const timeline = await auditService.getUserActivityTimeline(
    userId,
    parseInt(days)
  );

  res.json({
    success: true,
    data: timeline
  });
});

export const exportAuditLogs = asyncHandler(async (req, res) => {
  const {
    userId,
    action,
    entity,
    entityId,
    startDate,
    endDate,
    format = 'json'
  } = req.query;

  const filters = {
    userId,
    action,
    entity,
    entityId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined
  };

  const data = await auditService.exportLogs(filters, format);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    return res.send(data);
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
  res.json({
    success: true,
    data: JSON.parse(data)
  });
});


export const cleanupAuditLogs = asyncHandler(async (req, res) => {
  const { days = 90 } = req.query;

  const result = await auditService.cleanupOldLogs(parseInt(days));

  // Log the cleanup action
  await auditService.log({
    userId: req.user.id,
    action: 'CLEANUP_AUDIT_LOGS',
    entity: 'AuditLog',
    entityId: 'bulk',
    changes: { days: parseInt(days), deletedCount: result.deletedCount }
  });

  res.json({
    success: true,
    data: result
  });
});


export const getAuditActions = asyncHandler(async (req, res) => {
  const actions = [
    'USER_LOGIN',
    'USER_LOGOUT',
    'USER_REGISTER',
    'UPDATE_PROFILE',
    'CREATE_BLOOD_REQUEST',
    'UPDATE_BLOOD_REQUEST_STATUS',
    'RECORD_DONATION',
    'UPDATE_INVENTORY',
    'VERIFY_ENTITY',
    'ADMIN_CREATE_USER',
    'ADMIN_UPDATE_USER',
    'ADMIN_DELETE_USER',
    'ADMIN_VERIFY_HOSPITAL',
    'ADMIN_VERIFY_BLOOD_BANK',
    'ADMIN_VERIFY_DONOR',
    'CLEANUP_AUDIT_LOGS'
  ];

  res.json({
    success: true,
    data: actions
  });
});


export const getAuditEntities = asyncHandler(async (req, res) => {
  const entities = [
    'User',
    'DonorProfile',
    'Hospital',
    'BloodBank',
    'BloodRequest',
    'Donation',
    'InventoryItem',
    'Notification',
    'AuditLog'
  ];

  res.json({
    success: true,
    data: entities
  });
});

export default {
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
  getUserActivityTimeline,
  exportAuditLogs,
  cleanupAuditLogs,
  getAuditActions,
  getAuditEntities
};