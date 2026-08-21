// backend/src/user/bloodbank/bloodBankController.js

import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { ApiError, asyncHandler } from '../../middleware/errorHandler.js';

const prisma = new PrismaClient();

// ============ GET DASHBOARD STATS ============
export const getDashboardStats = asyncHandler(async (req, res) => {
  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank profile not found');
  }

  const [
    totalInventoryItems,
    inventoryStock,
    totalRequests,
    pendingRequests,
    totalDonations
  ] = await Promise.all([
    prisma.inventoryItem.count({ where: { bloodBankId: bloodBank.id } }),
    prisma.inventoryItem.findMany({ where: { bloodBankId: bloodBank.id } }),
    prisma.bloodRequest.count({ where: { bloodBankId: bloodBank.id } }),
    prisma.bloodRequest.count({ where: { bloodBankId: bloodBank.id, status: 'PENDING' } }),
    prisma.donation.count({ where: { bloodBankId: bloodBank.id } })
  ]);

  const totalUnitsAvailable = inventoryStock.reduce((sum, item) => sum + (item.unitsAvailable || 0), 0);

  res.json({
    success: true,
    data: {
      stats: {
        totalInventoryItems,
        totalUnitsAvailable,
        totalRequests,
        pendingRequests,
        totalDonations
      },
      inventory: inventoryStock
    }
  });
});

// ============ GET PROFILE ============
export const getProfile = asyncHandler(async (req, res) => {
  const bloodBank = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true
        }
      },
      inventory: true
    }
  });

  if (!bloodBank) {
    throw new ApiError(404, 'Blood Bank profile not found');
  }

  res.json({
    success: true,
    data: bloodBank
  });
});

// ============ UPDATE PROFILE ============
export const updateProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation Error', errors.array());
  }

  const { bankName, address, city, state, country, phone, emergencyContact } = req.body;

  const existing = await prisma.bloodBank.findUnique({
    where: { userId: req.user.id }
  });

  if (!existing) {
    throw new ApiError(404, 'Blood Bank profile not found');
  }

  const updated = await prisma.bloodBank.update({
    where: { userId: req.user.id },
    data: {
      bankName: bankName || existing.bankName,
      address: address || existing.address,
      city: city || existing.city,
      state: state || existing.state,
      country: country || existing.country,
      phone: phone || existing.phone,
      emergencyContact: emergencyContact || existing.emergencyContact
    },
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

  if (req.body.name) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { name: req.body.name }
    });
  }

  res.json({
    success: true,
    data: updated,
    message: 'Blood Bank profile updated successfully'
  });
});

// ============ GET INVENTORY ============
export const getInventory = asyncHandler(async (req, res) => {
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

  res.json({
    success: true,
    data: inventory
  });
});

export default {
  getDashboardStats,
  getProfile,
  updateProfile,
  getInventory
};
