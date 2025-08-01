const { Booking, Property, Guest } = require('../models');
const { validationResult } = require('express-validator');

class BookingsController {
  // PUBLIC_INTERFACE
  /**
   * Get all bookings with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBookings(req, res) {
    try {
      const { page = 1, limit = 10, status, propertyId, source, startDate, endDate } = req.query;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter = {};
      if (status) filter.status = status;
      if (propertyId) filter.propertyId = propertyId;
      if (source) filter.source = source;
      
      if (startDate || endDate) {
        filter.checkIn = {};
        if (startDate) filter.checkIn.$gte = new Date(startDate);
        if (endDate) filter.checkIn.$lte = new Date(endDate);
      }

      const bookings = await Booking.find(filter)
        .populate('propertyId', 'name address type')
        .populate('guestId', 'firstName lastName email phone')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ checkIn: -1 });

      const total = await Booking.countDocuments(filter);

      res.json({
        status: 'success',
        data: {
          bookings,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get booking by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBooking(req, res) {
    try {
      const { id } = req.params;

      const booking = await Booking.findById(id)
        .populate('propertyId', 'name address type images amenities')
        .populate('guestId', 'firstName lastName email phone nationality');

      if (!booking) {
        return res.status(404).json({
          status: 'error',
          message: 'Booking not found'
        });
      }

      res.json({
        status: 'success',
        data: booking
      });
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Create new booking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createBooking(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Check for overlapping bookings
      const { propertyId, checkIn, checkOut } = req.body;
      const overlapping = await Booking.findOne({
        propertyId,
        status: { $in: ['confirmed', 'checked-in'] },
        $or: [
          { checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } }
        ]
      });

      if (overlapping) {
        return res.status(409).json({
          status: 'error',
          message: 'Property is not available for selected dates'
        });
      }

      const booking = new Booking(req.body);
      await booking.save();

      const populatedBooking = await Booking.findById(booking._id)
        .populate('propertyId', 'name address type')
        .populate('guestId', 'firstName lastName email phone');

      res.status(201).json({
        status: 'success',
        message: 'Booking created successfully',
        data: populatedBooking
      });
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Update booking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateBooking(req, res) {
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

      const booking = await Booking.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      )
      .populate('propertyId', 'name address type')
      .populate('guestId', 'firstName lastName email phone');

      if (!booking) {
        return res.status(404).json({
          status: 'error',
          message: 'Booking not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Booking updated successfully',
        data: booking
      });
    } catch (error) {
      console.error('Update booking error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Cancel booking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async cancelBooking(req, res) {
    try {
      const { id } = req.params;

      const booking = await Booking.findByIdAndUpdate(
        id,
        { status: 'cancelled' },
        { new: true }
      )
      .populate('propertyId', 'name address')
      .populate('guestId', 'firstName lastName email');

      if (!booking) {
        return res.status(404).json({
          status: 'error',
          message: 'Booking not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Booking cancelled successfully',
        data: booking
      });
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get booking statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBookingStats(req, res) {
    try {
      const stats = await Booking.aggregate([
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            pendingBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            confirmedBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
            },
            checkedInBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'checked-in'] }, 1, 0] }
            },
            completedBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'checked-out'] }, 1, 0] }
            },
            cancelledBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            totalRevenue: { $sum: '$totalAmount' }
          }
        }
      ]);

      const sourceStats = await Booking.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
      ]);

      res.json({
        status: 'success',
        data: {
          overview: stats[0] || {
            totalBookings: 0,
            pendingBookings: 0,
            confirmedBookings: 0,
            checkedInBookings: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            totalRevenue: 0
          },
          bySource: sourceStats
        }
      });
    } catch (error) {
      console.error('Get booking stats error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new BookingsController();
