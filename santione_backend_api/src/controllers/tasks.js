const { Task, User, Property } = require('../models');
const { validationResult } = require('express-validator');

class TasksController {
  // PUBLIC_INTERFACE
  /**
   * Get all tasks with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTasks(req, res) {
    try {
      const { page = 1, limit = 10, status, priority, category, assignedTo } = req.query;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter = {};
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (category) filter.category = category;
      if (assignedTo) filter.assignedTo = assignedTo;

      const tasks = await Task.find(filter)
        .populate('assignedTo', 'firstName lastName email')
        .populate('propertyId', 'name address')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Task.countDocuments(filter);

      res.json({
        status: 'success',
        data: {
          tasks,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get task by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTask(req, res) {
    try {
      const { id } = req.params;

      const task = await Task.findById(id)
        .populate('assignedTo', 'firstName lastName email phone')
        .populate('propertyId', 'name address type');

      if (!task) {
        return res.status(404).json({
          status: 'error',
          message: 'Task not found'
        });
      }

      res.json({
        status: 'success',
        data: task
      });
    } catch (error) {
      console.error('Get task error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Create new task
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createTask(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const task = new Task(req.body);
      await task.save();

      const populatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'firstName lastName email')
        .populate('propertyId', 'name address');

      res.status(201).json({
        status: 'success',
        message: 'Task created successfully',
        data: populatedTask
      });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Update task
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateTask(req, res) {
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

      // If marking as completed, set completedAt timestamp
      if (req.body.status === 'completed' && !req.body.completedAt) {
        req.body.completedAt = new Date();
      }

      const task = await Task.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      )
      .populate('assignedTo', 'firstName lastName email')
      .populate('propertyId', 'name address');

      if (!task) {
        return res.status(404).json({
          status: 'error',
          message: 'Task not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Task updated successfully',
        data: task
      });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Delete task
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteTask(req, res) {
    try {
      const { id } = req.params;

      const task = await Task.findByIdAndDelete(id);

      if (!task) {
        return res.status(404).json({
          status: 'error',
          message: 'Task not found'
        });
      }

      res.json({
        status: 'success',
        message: 'Task deleted successfully'
      });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get tasks assigned to current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMyTasks(req, res) {
    try {
      const { status, priority } = req.query;
      const filter = { assignedTo: req.user.userId };
      
      if (status) filter.status = status;
      if (priority) filter.priority = priority;

      const tasks = await Task.find(filter)
        .populate('propertyId', 'name address')
        .sort({ priority: -1, dueDate: 1 });

      res.json({
        status: 'success',
        data: tasks
      });
    } catch (error) {
      console.error('Get my tasks error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new TasksController();
