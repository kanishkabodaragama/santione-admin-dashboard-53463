const { Property, Booking, Task, Revenue, SmartDevice, Guest } = require('../models');

class KPIsController {
  // PUBLIC_INTERFACE
  /**
   * Get dashboard overview KPIs
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDashboardOverview(req, res) {
    try {
      const currentDate = new Date();
      const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Portfolio overview
      const totalProperties = await Property.countDocuments();
      const activeProperties = await Property.countDocuments({ status: 'active' });
      const occupancyRate = totalProperties > 0 ? 
        await Booking.countDocuments({ 
          status: 'checked-in',
          checkIn: { $lte: currentDate },
          checkOut: { $gte: currentDate }
        }) / totalProperties * 100 : 0;

      // Booking statistics
      const totalBookings = await Booking.countDocuments();
      const monthlyBookings = await Booking.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });
      const pendingBookings = await Booking.countDocuments({ status: 'pending' });

      // Revenue statistics
      const totalRevenue = await Revenue.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const monthlyRevenue = await Revenue.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      // Task statistics
      const pendingTasks = await Task.countDocuments({ status: 'pending' });
      const urgentTasks = await Task.countDocuments({ 
        priority: 'urgent', 
        status: { $ne: 'completed' } 
      });

      // Smart device statistics
      const totalDevices = await SmartDevice.countDocuments();
      const onlineDevices = await SmartDevice.countDocuments({ status: 'online' });
      const offlineDevices = await SmartDevice.countDocuments({ status: 'offline' });

      // Guest statistics
      const totalGuests = await Guest.countDocuments();
      const newGuests = await Guest.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });

      res.json({
        status: 'success',
        data: {
          portfolio: {
            totalProperties,
            activeProperties,
            occupancyRate: Math.round(occupancyRate * 100) / 100
          },
          bookings: {
            total: totalBookings,
            monthly: monthlyBookings,
            pending: pendingBookings
          },
          revenue: {
            total: totalRevenue[0]?.total || 0,
            monthly: monthlyRevenue[0]?.total || 0
          },
          tasks: {
            pending: pendingTasks,
            urgent: urgentTasks
          },
          devices: {
            total: totalDevices,
            online: onlineDevices,
            offline: offlineDevices
          },
          guests: {
            total: totalGuests,
            new: newGuests
          }
        }
      });
    } catch (error) {
      console.error('Get dashboard overview error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get revenue chart data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRevenueChart(req, res) {
    try {
      const { period = '30', type = 'daily' } = req.query;
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let groupBy;
      let dateFormat;

      if (type === 'daily') {
        groupBy = {
          $dateToString: { format: '%Y-%m-%d', date: '$date' }
        };
        dateFormat = 'daily';
      } else if (type === 'weekly') {
        groupBy = {
          $dateToString: { format: '%Y-%U', date: '$date' }
        };
        dateFormat = 'weekly';
      } else {
        groupBy = {
          $dateToString: { format: '%Y-%m', date: '$date' }
        };
        dateFormat = 'monthly';
      }

      const revenueData = await Revenue.aggregate([
        { $match: { date: { $gte: startDate } } },
        {
          $group: {
            _id: groupBy,
            revenue: { $sum: '$amount' },
            bookings: { $sum: { $cond: [{ $eq: ['$type', 'booking'] }, 1, 0] } }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      res.json({
        status: 'success',
        data: {
          period: `${days} days`,
          type: dateFormat,
          chart: revenueData.map(item => ({
            date: item._id,
            revenue: item.revenue,
            bookings: item.bookings
          }))
        }
      });
    } catch (error) {
      console.error('Get revenue chart error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get occupancy rate over time
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOccupancyChart(req, res) {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const occupancyData = [];
      const totalProperties = await Property.countDocuments({ status: 'active' });

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayStart = new Date(d);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);

        const occupiedCount = await Booking.countDocuments({
          status: { $in: ['confirmed', 'checked-in'] },
          checkIn: { $lte: dayEnd },
          checkOut: { $gte: dayStart }
        });

        const occupancyRate = totalProperties > 0 ? (occupiedCount / totalProperties) * 100 : 0;

        occupancyData.push({
          date: dayStart.toISOString().split('T')[0],
          occupancyRate: Math.round(occupancyRate * 100) / 100,
          occupiedProperties: occupiedCount,
          totalProperties
        });
      }

      res.json({
        status: 'success',
        data: {
          period: `${days} days`,
          chart: occupancyData
        }
      });
    } catch (error) {
      console.error('Get occupancy chart error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get booking source distribution
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBookingSourceChart(req, res) {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const sourceData = await Booking.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      res.json({
        status: 'success',
        data: {
          period: `${days} days`,
          chart: sourceData.map(item => ({
            source: item._id,
            bookings: item.count,
            revenue: item.revenue
          }))
        }
      });
    } catch (error) {
      console.error('Get booking source chart error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get task completion metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTaskMetrics(req, res) {
    try {
      const currentDate = new Date();
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      
      const taskStats = await Task.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const weeklyTasks = await Task.aggregate([
        { $match: { createdAt: { $gte: startOfWeek } } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
          }
        }
      ]);

      const overdueTasks = await Task.countDocuments({
        dueDate: { $lt: currentDate },
        status: { $ne: 'completed' }
      });

      res.json({
        status: 'success',
        data: {
          overall: taskStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          weekly: weeklyTasks,
          overdue: overdueTasks
        }
      });
    } catch (error) {
      console.error('Get task metrics error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new KPIsController();
