const { Property } = require('../models');
const { validationResult } = require('express-validator');

class PropertiesController {
  // PUBLIC_INTERFACE
  /**
   * Get all properties with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProperties(req, res) {
    try {
      const { page = 1, limit = 10, status, type, city } = req.query;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter = {};
      if (status) filter.status = status;
      if (type) filter.type = type;
      if (city) filter['location.city'] = new RegExp(city, 'i');

      const properties = await Property.find(filter)
        .populate('ownerId', 'firstName lastName email')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Property.countDocuments(filter);

      res.json({
        status: 'success',
        data: {
          properties,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get properties error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get property by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProperty(req, res) {
    try {
      const { id } = req.params;

      const property = await Property.findById(id)
        .populate('ownerId', 'firstName lastName email phone');

      if (!property) {
        return res.status(404).json({
          status: 'error',
          message: 'Property not found'
        });
      }

      res.json({
        status: 'success',
        data: property
      });
    } catch (error) {
      console.error('Get property error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Create new property
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createProperty(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const propertyData = {
        ...req.body,
        ownerId: req.user.userId
      };

      const property = new Property(propertyData);
      await property.save();

      const populatedProperty = await Property.findById(property._id)
        .populate('ownerId', 'firstName lastName email');

      res.status(201).json({
        status: 'success',
        message: 'Property created successfully',
        data: populatedProperty
      });
    } catch (error) {
      console.error('Create property error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Update property
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProperty(req, res) {
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

      const property = await Property.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      ).populate('ownerId', 'firstName lastName email');

      if (!property) {
        return res.status(404).json({
          status: 'error',
          message: 'Property not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Property updated successfully',
        data: property
      });
    } catch (error) {
      console.error('Update property error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Delete property
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteProperty(req, res) {
    try {
      const { id } = req.params;

      const property = await Property.findByIdAndDelete(id);

      if (!property) {
        return res.status(404).json({
          status: 'error',
          message: 'Property not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Property deleted successfully'
      });
    } catch (error) {
      console.error('Delete property error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get property statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPropertyStats(req, res) {
    try {
      const stats = await Property.aggregate([
        {
          $group: {
            _id: null,
            totalProperties: { $sum: 1 },
            activeProperties: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            inactiveProperties: {
              $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
            },
            maintenanceProperties: {
              $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] }
            }
          }
        }
      ]);

      const typeStats = await Property.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);

      res.json({
        status: 'success',
        data: {
          overview: stats[0] || {
            totalProperties: 0,
            activeProperties: 0,
            inactiveProperties: 0,
            maintenanceProperties: 0
          },
          byType: typeStats
        }
      });
    } catch (error) {
      console.error('Get property stats error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new PropertiesController();
