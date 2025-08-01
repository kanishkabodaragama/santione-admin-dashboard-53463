const { Revenue, Property, Booking } = require('../models');
const { validationResult } = require('express-validator');

class RevenueController {
  // PUBLIC_INTERFACE
  /**
   * Get all revenue records with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRevenue(req, res) {
    try {
      const { page = 1, limit = 10, type, propertyId, startDate, endDate } = req.query;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter = {};
      if (type) filter.type = type;
      if (propertyId) filter.propertyId = propertyId;
      
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }

      const revenue = await Revenue.find(filter)
        .populate('propertyId', 'name address')
        .populate('bookingId', 'confirmation checkIn checkOut')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ date: -1 });

      const total = await Revenue.countDocuments(filter);

      res.json({
        status: 'success',
        data: {
          revenue,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get revenue error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Create new revenue record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createRevenue(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const revenue = new Revenue(req.body);
      await revenue.save();

      const populatedRevenue = await Revenue.findById(revenue._id)
        .populate('propertyId', 'name address')
        .populate('bookingId', 'confirmation checkIn checkOut');

      res.status(201).json({
        status: 'success',
        message: 'Revenue record created successfully',
        data: populatedRevenue
      });
    } catch (error) {
      console.error('Create revenue error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get revenue summary and analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRevenueSummary(req, res) {
    try {
      const { period = '30', propertyId } = req.query;
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const filter = { date: { $gte: startDate } };
      if (propertyId) filter.propertyId = propertyId;

      // Total revenue
      const totalRevenue = await Revenue.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      // Revenue by type
      const revenueByType = await Revenue.aggregate([
        { $match: filter },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]);

      // Revenue by property
      const revenueByProperty = await Revenue.aggregate([
        { $match: filter },
        { $group: { _id: '$propertyId', total: { $sum: '$amount' } } },
        { $lookup: { from: 'properties', localField: '_id', foreignField: '_id', as: 'property' } },
        { $unwind: '$property' },
        { $project: { total: 1, propertyName: '$property.name', propertyAddress: '$property.address' } }
      ]);

      // Daily revenue trend
      const dailyRevenue = await Revenue.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      res.json({
        status: 'success',
        data: {
          period: `${days} days`,
          total: totalRevenue[0]?.total || 0,
          byType: revenueByType,
          byProperty: revenueByProperty,
          dailyTrend: dailyRevenue.map(item => ({
            date: item._id,
            revenue: item.total,
            transactions: item.count
          }))
        }
      });
    } catch (error) {
      console.error('Get revenue summary error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Update revenue record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateRevenue(req, res) {
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

      const revenue = await Revenue.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      )
      .populate('propertyId', 'name address')
      .populate('bookingId', 'confirmation checkIn checkOut');

      if (!revenue) {
        return res.status(404).json({
          status: 'error',
          message: 'Revenue record not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Revenue record updated successfully',
        data: revenue
      });
    } catch (error) {
      console.error('Update revenue error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Delete revenue record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteRevenue(req, res) {
    try {
      const { id } = req.params;

      const revenue = await Revenue.findByIdAndDelete(id);

      if (!revenue) {
        return res.status(404).json({
          status: 'error',
          message: 'Revenue record not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Revenue record deleted successfully'
      });
    } catch (error) {
      console.error('Delete revenue error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new RevenueController();
