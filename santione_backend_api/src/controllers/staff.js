const { Staff, User } = require('../models');
const { validationResult } = require('express-validator');

class StaffController {
  // PUBLIC_INTERFACE
  /**
   * Get all staff members with pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStaff(req, res) {
    try {
      const { page = 1, limit = 10, department, position } = req.query;
      const skip = (page - 1) * limit;

      const filter = {};
      if (department) filter.department = department;
      if (position) filter.position = position;

      const staff = await Staff.find(filter)
        .populate('userId', 'firstName lastName email phone role isActive')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Staff.countDocuments(filter);

      res.json({
        status: 'success',
        data: {
          staff,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get staff error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get staff member by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStaffMember(req, res) {
    try {
      const { id } = req.params;

      const staffMember = await Staff.findById(id)
        .populate('userId', 'firstName lastName email phone role profileImage');

      if (!staffMember) {
        return res.status(404).json({
          status: 'error',
          message: 'Staff member not found'
        });
      }

      res.json({
        status: 'success',
        data: staffMember
      });
    } catch (error) {
      console.error('Get staff member error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Create new staff member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createStaffMember(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Check if staff record already exists for this user
      const existingStaff = await Staff.findOne({ userId: req.body.userId });
      if (existingStaff) {
        return res.status(409).json({
          status: 'error',
          message: 'Staff record already exists for this user'
        });
      }

      const staff = new Staff(req.body);
      await staff.save();

      const populatedStaff = await Staff.findById(staff._id)
        .populate('userId', 'firstName lastName email phone role');

      res.status(201).json({
        status: 'success',
        message: 'Staff member created successfully',
        data: populatedStaff
      });
    } catch (error) {
      console.error('Create staff member error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Update staff member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateStaffMember(req, res) {
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

      const staff = await Staff.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      ).populate('userId', 'firstName lastName email phone role');

      if (!staff) {
        return res.status(404).json({
          status: 'error',
          message: 'Staff member not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Staff member updated successfully',
        data: staff
      });
    } catch (error) {
      console.error('Update staff member error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Delete staff member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteStaffMember(req, res) {
    try {
      const { id } = req.params;

      const staff = await Staff.findByIdAndDelete(id);

      if (!staff) {
        return res.status(404).json({
          status: 'error',
          message: 'Staff member not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Staff member deleted successfully'
      });
    } catch (error) {
      console.error('Delete staff member error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get staff statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStaffStats(req, res) {
    try {
      const totalStaff = await Staff.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      
      const departmentStats = await Staff.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]);

      const positionStats = await Staff.aggregate([
        { $group: { _id: '$position', count: { $sum: 1 } } }
      ]);

      res.json({
        status: 'success',
        data: {
          overview: {
            totalStaff,
            activeUsers
          },
          byDepartment: departmentStats,
          byPosition: positionStats
        }
      });
    } catch (error) {
      console.error('Get staff stats error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new StaffController();
