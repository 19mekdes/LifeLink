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

// ============ GET ALL INVENTORY ============
export const getAllInventory = asyncHandler(async (req, res) => {
  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const inventory = await prisma.inventoryItem.findMany({
    where: { bloodBankId: bloodBank.id },
    orderBy: { bloodType: 'asc' }
  });

  // Calculate summary
  const totalUnits = inventory.reduce((sum, item) => sum + Number(item.unitsAvailable), 0);
  const lowStockItems = inventory.filter(
    item => item.unitsAvailable <= item.minStockLevel
  );
  const outOfStockItems = inventory.filter(
    item => item.unitsAvailable === 0
  );

  const responseData = {
    inventory,
    summary: {
      totalUnits,
      lowStockItems: lowStockItems.length,
      outOfStockItems: outOfStockItems.length,
      bloodTypes: inventory.length
    },
    lowStockItems,
    outOfStockItems
  };

  res.json({
    success: true,
    data: serializeData(responseData)
  });
});

// ============ GET INVENTORY BY BLOOD TYPE ============

export const getInventoryByBloodType = asyncHandler(async (req, res) => {
  const { bloodType } = req.params;

  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const inventory = await prisma.inventoryItem.findUnique({
    where: {
      bloodBankId_bloodType: {
        bloodBankId: bloodBank.id,
        bloodType: bloodType
      }
    }
  });

  if (!inventory) {
    throw new ApiError(404, `Inventory not found for blood type: ${bloodType}`);
  }

  res.json({
    success: true,
    data: serializeData(inventory)
  });
});

// ============ CREATE OR UPDATE INVENTORY ============
export const upsertInventory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { bloodType, unitsAvailable, minStockLevel, expiryDate } = req.body;

  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const inventory = await prisma.inventoryItem.upsert({
    where: {
      bloodBankId_bloodType: {
        bloodBankId: bloodBank.id,
        bloodType: bloodType
      }
    },
    update: {
      unitsAvailable: unitsAvailable !== undefined ? parseInt(unitsAvailable) : undefined,
      minStockLevel: minStockLevel !== undefined ? parseInt(minStockLevel) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      status: parseInt(unitsAvailable) > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK'
    },
    create: {
      bloodBankId: bloodBank.id,
      bloodType: bloodType,
      unitsAvailable: parseInt(unitsAvailable) || 0,
      minStockLevel: minStockLevel ? parseInt(minStockLevel) : 5,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      status: parseInt(unitsAvailable) > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK'
    }
  });

  // Log action
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPSERT_INVENTORY',
      entity: 'InventoryItem',
      entityId: inventory.id,
      changes: { bloodType, unitsAvailable, minStockLevel, expiryDate }
    }
  });

  res.status(201).json({
    success: true,
    data: serializeData(inventory),
    message: 'Inventory updated successfully'
  });
});

// ============ UPDATE INVENTORY UNITS ============

export const updateInventoryUnits = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { bloodType } = req.params;
  const { unitsAvailable, operation } = req.body;

  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const existingInventory = await prisma.inventoryItem.findUnique({
    where: {
      bloodBankId_bloodType: {
        bloodBankId: bloodBank.id,
        bloodType: bloodType
      }
    }
  });

  if (!existingInventory) {
    throw new ApiError(404, `Inventory not found for blood type: ${bloodType}`);
  }

  let newUnits = parseInt(unitsAvailable);

  // If operation is 'add' or 'subtract', modify existing units
  if (operation === 'add') {
    newUnits = existingInventory.unitsAvailable + parseInt(unitsAvailable);
  } else if (operation === 'subtract') {
    newUnits = existingInventory.unitsAvailable - parseInt(unitsAvailable);
    if (newUnits < 0) {
      throw new ApiError(400, 'Insufficient inventory units');
    }
  }

  const inventory = await prisma.inventoryItem.update({
    where: {
      bloodBankId_bloodType: {
        bloodBankId: bloodBank.id,
        bloodType: bloodType
      }
    },
    data: {
      unitsAvailable: newUnits,
      status: newUnits > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK'
    }
  });

  // Log action
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE_INVENTORY_UNITS',
      entity: 'InventoryItem',
      entityId: inventory.id,
      changes: { bloodType, unitsAvailable: newUnits, operation }
    }
  });

  res.json({
    success: true,
    data: serializeData(inventory),
    message: `Inventory updated successfully. New units: ${newUnits}`
  });
});

// ============ DELETE INVENTORY ============

export const deleteInventory = asyncHandler(async (req, res) => {
  const { bloodType } = req.params;

  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const inventory = await prisma.inventoryItem.findUnique({
    where: {
      bloodBankId_bloodType: {
        bloodBankId: bloodBank.id,
        bloodType: bloodType
      }
    }
  });

  if (!inventory) {
    throw new ApiError(404, `Inventory not found for blood type: ${bloodType}`);
  }

  await prisma.inventoryItem.delete({
    where: {
      bloodBankId_bloodType: {
        bloodBankId: bloodBank.id,
        bloodType: bloodType
      }
    }
  });

  // Log action
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DELETE_INVENTORY',
      entity: 'InventoryItem',
      entityId: inventory.id,
      changes: { bloodType }
    }
  });

  res.json({
    success: true,
    message: `Inventory for blood type ${bloodType} deleted successfully`
  });
});

// ============ GET LOW STOCK ITEMS ============

export const getLowStockItems = asyncHandler(async (req, res) => {
  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const lowStockItems = await prisma.inventoryItem.findMany({
    where: {
      bloodBankId: bloodBank.id,
      unitsAvailable: {
        lte: prisma.inventoryItem.fields.minStockLevel
      }
    },
    orderBy: { bloodType: 'asc' }
  });

  res.json({
    success: true,
    data: serializeData(lowStockItems),
    count: lowStockItems.length
  });
});

// ============ GET EXPIRING ITEMS ============

export const getExpiringItems = asyncHandler(async (req, res) => {
  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringItems = await prisma.inventoryItem.findMany({
    where: {
      bloodBankId: bloodBank.id,
      expiryDate: {
        lte: thirtyDaysFromNow,
        not: null
      },
      unitsAvailable: {
        gt: 0
      }
    },
    orderBy: { expiryDate: 'asc' }
  });

  res.json({
    success: true,
    data: serializeData(expiringItems),
    count: expiringItems.length
  });
});

// ============ GET INVENTORY STATISTICS ============
export const getInventoryStats = asyncHandler(async (req, res) => {
  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const inventory = await prisma.inventoryItem.findMany({
    where: { bloodBankId: bloodBank.id }
  });

  const totalUnits = inventory.reduce((sum, item) => sum + Number(item.unitsAvailable), 0);
  const totalReserved = inventory.reduce((sum, item) => sum + Number(item.unitsReserved), 0);
  const totalExpired = inventory.reduce((sum, item) => sum + Number(item.unitsExpired), 0);
  const lowStockCount = inventory.filter(
    item => item.unitsAvailable <= item.minStockLevel
  ).length;
  const outOfStockCount = inventory.filter(
    item => item.unitsAvailable === 0
  ).length;

  // Blood type distribution
  const distribution = inventory.map(item => ({
    bloodType: item.bloodType,
    unitsAvailable: Number(item.unitsAvailable),
    status: item.status
  }));

  const responseData = {
    totalUnits,
    totalReserved,
    totalExpired,
    lowStockCount,
    outOfStockCount,
    bloodTypes: inventory.length,
    distribution
  };

  res.json({
    success: true,
    data: serializeData(responseData)
  });
});

// ============ BULK UPDATE INVENTORY ============

export const bulkUpdateInventory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Items array is required');
  }

  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank not found');
  }

  const results = [];

  for (const item of items) {
    const { bloodType, unitsAvailable, minStockLevel, expiryDate } = item;

    const inventory = await prisma.inventoryItem.upsert({
      where: {
        bloodBankId_bloodType: {
          bloodBankId: bloodBank.id,
          bloodType: bloodType
        }
      },
      update: {
        unitsAvailable: unitsAvailable !== undefined ? parseInt(unitsAvailable) : undefined,
        minStockLevel: minStockLevel !== undefined ? parseInt(minStockLevel) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        status: parseInt(unitsAvailable) > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK'
      },
      create: {
        bloodBankId: bloodBank.id,
        bloodType: bloodType,
        unitsAvailable: parseInt(unitsAvailable) || 0,
        minStockLevel: minStockLevel ? parseInt(minStockLevel) : 5,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: parseInt(unitsAvailable) > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK'
      }
    });

    results.push(inventory);
  }

  // Log action
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'BULK_UPDATE_INVENTORY',
      entity: 'InventoryItem',
      entityId: 'bulk',
      changes: { count: items.length }
    }
  });

  res.json({
    success: true,
    data: serializeData(results),
    message: `Successfully updated ${results.length} inventory items`
  });
});

export default {
  getAllInventory,
  getInventoryByBloodType,
  upsertInventory,
  updateInventoryUnits,
  deleteInventory,
  getLowStockItems,
  getExpiringItems,
  getInventoryStats,
  bulkUpdateInventory
};