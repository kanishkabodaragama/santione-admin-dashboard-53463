const { SmartDevice, Property } = require('../models');
const { validationResult } = require('express-validator');

class SmartDevicesController {
  // PUBLIC_INTERFACE
  /**
   * Get all smart devices with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDevices(req, res) {
    try {
      const { page = 1, limit = 10, deviceType, status, propertyId } = req.query;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter = {};
      if (deviceType) filter.deviceType = deviceType;
      if (status) filter.status = status;
      if (propertyId) filter.propertyId = propertyId;

      const devices = await SmartDevice.find(filter)
        .populate('propertyId', 'name address')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await SmartDevice.countDocuments(filter);

      res.json({
        status: 'success',
        data: {
          devices,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get devices error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get device by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDevice(req, res) {
    try {
      const { id } = req.params;

      const device = await SmartDevice.findById(id)
        .populate('propertyId', 'name address type');

      if (!device) {
        return res.status(404).json({
          status: 'error',
          message: 'Device not found'
        });
      }

      res.json({
        status: 'success',
        data: device
      });
    } catch (error) {
      console.error('Get device error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Create new smart device
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createDevice(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const device = new SmartDevice({
        ...req.body,
        lastSeen: new Date()
      });
      await device.save();

      const populatedDevice = await SmartDevice.findById(device._id)
        .populate('propertyId', 'name address');

      res.status(201).json({
        status: 'success',
        message: 'Device created successfully',
        data: populatedDevice
      });
    } catch (error) {
      console.error('Create device error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Update smart device
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateDevice(req, res) {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const device = await SmartDevice.findByIdAndUpdate(
        id,
        { ...req.body, lastSeen: new Date() },
        { new: true, runValidators: true }
      ).populate('propertyId', 'name address');

      if (!device) {
        return res.status(404).json({
          status: 'error',
          message: 'Device not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Device updated successfully',
        data: device
      });
    } catch (error) {
      console.error('Update device error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Delete smart device
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteDevice(req, res) {
    try {
      const { id } = req.params;

      const device = await SmartDevice.findByIdAndDelete(id);

      if (!device) {
        return res.status(404).json({
          status: 'error',
          message: 'Device not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Device deleted successfully'
      });
    } catch (error) {
      console.error('Delete device error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get device statistics by type and status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDeviceStats(req, res) {
    try {
      const totalDevices = await SmartDevice.countDocuments();
      const onlineDevices = await SmartDevice.countDocuments({ status: 'online' });
      const offlineDevices = await SmartDevice.countDocuments({ status: 'offline' });
      const maintenanceDevices = await SmartDevice.countDocuments({ status: 'maintenance' });

      const devicesByType = await SmartDevice.aggregate([
        { $group: { _id: '$deviceType', count: { $sum: 1 } } }
      ]);

      const devicesByProperty = await SmartDevice.aggregate([
        { $group: { _id: '$propertyId', count: { $sum: 1 } } },
        { $lookup: { from: 'properties', localField: '_id', foreignField: '_id', as: 'property' } },
        { $unwind: '$property' },
        { $project: { count: 1, propertyName: '$property.name' } }
      ]);

      // Low battery devices (battery level < 20%)
      const lowBatteryDevices = await SmartDevice.countDocuments({
        batteryLevel: { $lt: 20, $ne: null }
      });

      res.json({
        status: 'success',
        data: {
          overview: {
            total: totalDevices,
            online: onlineDevices,
            offline: offlineDevices,
            maintenance: maintenanceDevices,
            lowBattery: lowBatteryDevices
          },
          byType: devicesByType,
          byProperty: devicesByProperty
        }
      });
    } catch (error) {
      console.error('Get device stats error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Update device status (for IoT integration)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateDeviceStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, batteryLevel, settings } = req.body;

      const updateData = { lastSeen: new Date() };
      if (status) updateData.status = status;
      if (batteryLevel !== undefined) updateData.batteryLevel = batteryLevel;
      if (settings) updateData.settings = settings;

      const device = await SmartDevice.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).populate('propertyId', 'name address');

      if (!device) {
        return res.status(404).json({
          status: 'error',
          message: 'Device not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Device status updated',
        data: device
      });
    } catch (error) {
      console.error('Update device status error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new SmartDevicesController();
