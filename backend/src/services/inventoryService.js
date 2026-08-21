import prisma from '../config/database.js';

/**
 * Inventory Service
 * Handles all inventory-related business logic
 */
class InventoryService {
  /**
   * Check if inventory is sufficient for a request
   * @param {string} bloodBankId - Blood bank ID
   * @param {string} bloodType - Blood type
   * @param {number} unitsRequired - Units required
   * @returns {Promise<Object>} - { sufficient, availableUnits, needsDonorSupport }
   */
  async checkInventoryAvailability(bloodBankId, bloodType, unitsRequired) {
    try {
      const inventory = await prisma.inventoryItem.findUnique({
        where: {
          bloodBankId_bloodType: {
            bloodBankId,
            bloodType
          }
        }
      });

      if (!inventory) {
        return {
          sufficient: false,
          availableUnits: 0,
          needsDonorSupport: true,
          message: 'No inventory found for this blood type'
        };
      }

      const availableUnits = inventory.unitsAvailable - inventory.unitsReserved;
      const sufficient = availableUnits >= unitsRequired;
      const needsDonorSupport = !sufficient;

      return {
        sufficient,
        availableUnits,
        needsDonorSupport,
        message: sufficient 
          ? 'Sufficient inventory available' 
          : 'Insufficient inventory, donor support needed'
      };
    } catch (error) {
      console.error('Check inventory availability error:', error);
      throw error;
    }
  }

  /**
   * Reserve inventory units for a request
   * @param {string} bloodBankId - Blood bank ID
   * @param {string} bloodType - Blood type
   * @param {number} unitsToReserve - Units to reserve
   * @returns {Promise<Object>} - Updated inventory
   */
  async reserveInventory(bloodBankId, bloodType, unitsToReserve) {
    try {
      const inventory = await prisma.inventoryItem.findUnique({
        where: {
          bloodBankId_bloodType: {
            bloodBankId,
            bloodType
          }
        }
      });

      if (!inventory) {
        throw new Error(`Inventory not found for blood type: ${bloodType}`);
      }

      const availableUnits = inventory.unitsAvailable - inventory.unitsReserved;
      if (availableUnits < unitsToReserve) {
        throw new Error(`Insufficient inventory. Available: ${availableUnits}, Required: ${unitsToReserve}`);
      }

      const updatedInventory = await prisma.inventoryItem.update({
        where: {
          bloodBankId_bloodType: {
            bloodBankId,
            bloodType
          }
        },
        data: {
          unitsReserved: inventory.unitsReserved + unitsToReserve
        }
      });

      return updatedInventory;
    } catch (error) {
      console.error('Reserve inventory error:', error);
      throw error;
    }
  }

  /**
   * Release reserved inventory units
   * @param {string} bloodBankId - Blood bank ID
   * @param {string} bloodType - Blood type
   * @param {number} unitsToRelease - Units to release
   * @returns {Promise<Object>} - Updated inventory
   */
  async releaseReservedInventory(bloodBankId, bloodType, unitsToRelease) {
    try {
      const inventory = await prisma.inventoryItem.findUnique({
        where: {
          bloodBankId_bloodType: {
            bloodBankId,
            bloodType
          }
        }
      });

      if (!inventory) {
        throw new Error(`Inventory not found for blood type: ${bloodType}`);
      }

      const newReserved = Math.max(0, inventory.unitsReserved - unitsToRelease);

      const updatedInventory = await prisma.inventoryItem.update({
        where: {
          bloodBankId_bloodType: {
            bloodBankId,
            bloodType
          }
        },
        data: {
          unitsReserved: newReserved
        }
      });

      return updatedInventory;
    } catch (error) {
      console.error('Release reserved inventory error:', error);
      throw error;
    }
  }

  /**
   * Add units to inventory
   * @param {string} bloodBankId - Blood bank ID
   * @param {string} bloodType - Blood type
   * @param {number} units - Units to add
   * @param {Date} expiryDate - Expiry date (optional)
   * @returns {Promise<Object>} - Updated inventory
   */
  async addInventoryUnits(bloodBankId, bloodType, units, expiryDate = null) {
    try {
      const inventory = await prisma.inventoryItem.upsert({
        where: {
          bloodBankId_bloodType: {
            bloodBankId,
            bloodType
          }
        },
        update: {
          unitsAvailable: { increment: units },
          status: 'AVAILABLE',
          expiryDate: expiryDate || undefined
        },
        create: {
          bloodBankId,
          bloodType,
          unitsAvailable: units,
          unitsReserved: 0,
          unitsExpired: 0,
          minStockLevel: 5,
          expiryDate: expiryDate || null,
          status: 'AVAILABLE'
        }
      });

      return inventory;
    } catch (error) {
      console.error('Add inventory units error:', error);
      throw error;
    }
  }

  /**
   * Remove units from inventory
   * @param {string} bloodBankId - Blood bank ID
   * @param {string} bloodType - Blood type
   * @param {number} units - Units to remove
   * @returns {Promise<Object>} - Updated inventory
   */
  async removeInventoryUnits(bloodBankId, bloodType, units) {
    try {
      const inventory = await prisma.inventoryItem.findUnique({
        where: {
          bloodBankId_bloodType: {
            bloodBankId,
            bloodType
          }
        }
      });

      if (!inventory) {
        throw new Error(`Inventory not found for blood type: ${bloodType}`);
      }

      if (inventory.unitsAvailable < units) {
        throw new Error(`Insufficient inventory. Available: ${inventory.unitsAvailable}, Requested: ${units}`);
      }

      const updatedInventory = await prisma.inventoryItem.update({
        where: {
          bloodBankId_bloodType: {
            bloodBankId,
            bloodType
          }
        },
        data: {
          unitsAvailable: inventory.unitsAvailable - units,
          status: (inventory.unitsAvailable - units) > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK'
        }
      });

      return updatedInventory;
    } catch (error) {
      console.error('Remove inventory units error:', error);
      throw error;
    }
  }

  /**
   * Mark expired units
   * @param {string} bloodBankId - Blood bank ID
   * @param {string} bloodType - Blood type
   * @param {number} units - Units to mark as expired
   * @returns {Promise<Object>} - Updated inventory
   */
  async markUnitsExpired(bloodBankId, bloodType, units) {
    try {
      const inventory = await prisma.inventoryItem.findUnique({
        where: {
          bloodBankId_bloodType: {
            bloodBankId,
            bloodType
          }
        }
      });

      if (!inventory) {
        throw new Error(`Inventory not found for blood type: ${bloodType}`);
      }

      if (inventory.unitsAvailable < units) {
        throw new Error(`Insufficient inventory to mark as expired. Available: ${inventory.unitsAvailable}`);
      }

      const updatedInventory = await prisma.inventoryItem.update({
        where: {
          bloodBankId_bloodType: {
            bloodBankId,
            bloodType
          }
        },
        data: {
          unitsAvailable: inventory.unitsAvailable - units,
          unitsExpired: inventory.unitsExpired + units,
          status: (inventory.unitsAvailable - units) > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK'
        }
      });

      return updatedInventory;
    } catch (error) {
      console.error('Mark units expired error:', error);
      throw error;
    }
  }

  /**
   * Get inventory summary
   * @param {string} bloodBankId - Blood bank ID
   * @returns {Promise<Object>} - Inventory summary
   */
  async getInventorySummary(bloodBankId) {
    try {
      const inventory = await prisma.inventoryItem.findMany({
        where: { bloodBankId }
      });

      const summary = {
        totalUnits: 0,
        totalReserved: 0,
        totalExpired: 0,
        lowStockItems: [],
        outOfStockItems: [],
        bloodTypes: inventory.length
      };

      for (const item of inventory) {
        summary.totalUnits += item.unitsAvailable;
        summary.totalReserved += item.unitsReserved;
        summary.totalExpired += item.unitsExpired;

        if (item.unitsAvailable <= item.minStockLevel && item.unitsAvailable > 0) {
          summary.lowStockItems.push({
            bloodType: item.bloodType,
            unitsAvailable: item.unitsAvailable,
            minStockLevel: item.minStockLevel
          });
        }

        if (item.unitsAvailable === 0) {
          summary.outOfStockItems.push({
            bloodType: item.bloodType,
            unitsAvailable: 0
          });
        }
      }

      return summary;
    } catch (error) {
      console.error('Get inventory summary error:', error);
      throw error;
    }
  }

  /**
   * Get inventory by blood type
   * @param {string} bloodBankId - Blood bank ID
   * @param {string} bloodType - Blood type
   * @returns {Promise<Object>} - Inventory item
   */
  async getInventoryByBloodType(bloodBankId, bloodType) {
    try {
      const inventory = await prisma.inventoryItem.findUnique({
        where: {
          bloodBankId_bloodType: {
            bloodBankId,
            bloodType
          }
        }
      });

      if (!inventory) {
        return {
          bloodType,
          unitsAvailable: 0,
          unitsReserved: 0,
          unitsExpired: 0,
          minStockLevel: 5,
          status: 'OUT_OF_STOCK',
          available: 0
        };
      }

      return {
        ...inventory,
        available: inventory.unitsAvailable - inventory.unitsReserved
      };
    } catch (error) {
      console.error('Get inventory by blood type error:', error);
      throw error;
    }
  }

  /**
   * Get expiring items (within 30 days)
   * @param {string} bloodBankId - Blood bank ID
   * @returns {Promise<Array>} - Expiring items
   */
  async getExpiringItems(bloodBankId) {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringItems = await prisma.inventoryItem.findMany({
        where: {
          bloodBankId,
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

      return expiringItems;
    } catch (error) {
      console.error('Get expiring items error:', error);
      throw error;
    }
  }

  /**
   * Check for low stock alerts
   * @param {string} bloodBankId - Blood bank ID
   * @returns {Promise<Array>} - Low stock alerts
   */
  async getLowStockAlerts(bloodBankId) {
    try {
      const lowStockItems = await prisma.inventoryItem.findMany({
        where: {
          bloodBankId,
          unitsAvailable: {
            lte: prisma.inventoryItem.fields.minStockLevel
          }
        },
        orderBy: { bloodType: 'asc' }
      });

      return lowStockItems.map(item => ({
        bloodType: item.bloodType,
        unitsAvailable: item.unitsAvailable,
        minStockLevel: item.minStockLevel,
        severity: item.unitsAvailable === 0 ? 'CRITICAL' : 'WARNING'
      }));
    } catch (error) {
      console.error('Get low stock alerts error:', error);
      throw error;
    }
  }

  /**
   * Transfer inventory between blood banks
   * @param {string} fromBloodBankId - Source blood bank ID
   * @param {string} toBloodBankId - Destination blood bank ID
   * @param {string} bloodType - Blood type
   * @param {number} units - Units to transfer
   * @returns {Promise<Object>} - Transfer result
   */
  async transferInventory(fromBloodBankId, toBloodBankId, bloodType, units) {
    try {
      // Remove from source
      const fromInventory = await this.removeInventoryUnits(fromBloodBankId, bloodType, units);

      // Add to destination
      const toInventory = await this.addInventoryUnits(toBloodBankId, bloodType, units);

      return {
        success: true,
        from: fromInventory,
        to: toInventory,
        message: `Successfully transferred ${units} units of ${bloodType}`
      };
    } catch (error) {
      console.error('Transfer inventory error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new InventoryService();