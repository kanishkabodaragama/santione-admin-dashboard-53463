const { Guest, Booking } = require('../models');
const { validationResult } = require('express-validator');

class GuestsController {
  // PUBLIC_INTERFACE
  /**
   * Get all guests with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGuests(req, res) {
    try {
      const { page = 1, limit = 10, search, nationality } = req.query;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter = {};
      if (search) {
        filter.$or = [
          { firstName: new RegExp(search, 'i') },
          { lastName: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') }
        ];
      }
      if (nationality) filter.nationality = nationality;

      const guests = await Guest.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Guest.countDocuments(filter);

      res.json({
        status: 'success',
        data: {
          guests,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get guests error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get guest by ID with booking history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGuest(req, res) {
    try {
      const { id } = req.params;

      const guest = await Guest.findById(id);
      if (!guest) {
        return res.status(404).json({
          status: 'error',
          message: 'Guest not found'
        });
      }

      // Get guest's booking history
      const bookings = await Booking.find({ guestId: id })
        .populate('propertyId', 'name address type')
        .sort({ checkIn: -1 });

      res.json({
        status: 'success',
        data: {
          guest,
          bookings
        }
      });
    } catch (error) {
      console.error('Get guest error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Create new guest
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createGuest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const guest = new Guest(req.body);
      await guest.save();

      res.status(201).json({
        status: 'success',
        message: 'Guest created successfully',
        data: guest
      });
    } catch (error) {
      console.error('Create guest error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Update guest
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateGuest(req, res) {
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

      const guest = await Guest.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!guest) {
        return res.status(404).json({
          status: 'error',
          message: 'Guest not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Guest updated successfully',
        data: guest
      });
    } catch (error) {
      console.error('Update guest error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Delete guest
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteGuest(req, res) {
    try {
      const { id } = req.params;

      // Check if guest has active bookings
      const activeBookings = await Booking.countDocuments({
        guestId: id,
        status: { $in: ['confirmed', 'checked-in'] }
      });

      if (activeBookings > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot delete guest with active bookings'
        });
      }

      const guest = await Guest.findByIdAndDelete(id);

      if (!guest) {
        return res.status(404).json({
          status: 'error',
          message: 'Guest not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Guest deleted successfully'
      });
    } catch (error) {
      console.error('Delete guest error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new GuestsController();
