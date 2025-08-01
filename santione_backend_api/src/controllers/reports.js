const { Revenue, Booking, Property, Task, Guest, SmartDevice } = require('../models');

class ReportsController {
  // PUBLIC_INTERFACE
  /**
   * Generate occupancy report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateOccupancyReport(req, res) {
    try {
      const { startDate, endDate, propertyId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          status: 'error',
          message: 'Start date and end date are required'
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const filter = {
        checkIn: { $lte: end },
        checkOut: { $gte: start },
        status: { $in: ['confirmed', 'checked-in', 'checked-out'] }
      };

      if (propertyId) filter.propertyId = propertyId;

      const bookings = await Booking.find(filter)
        .populate('propertyId', 'name address type')
        .populate('guestId', 'firstName lastName nationality');

      // Calculate occupancy metrics
      const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const propertyFilter = propertyId ? { _id: propertyId } : {};
      const totalProperties = await Property.countDocuments(propertyFilter);
      
      const occupancyData = bookings.reduce((acc, booking) => {
        const checkIn = new Date(Math.max(booking.checkIn, start));
        const checkOut = new Date(Math.min(booking.checkOut, end));
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        
        if (!acc[booking.propertyId._id]) {
          acc[booking.propertyId._id] = {
            property: booking.propertyId,
            totalNights: 0,
            bookings: []
          };
        }
        
        acc[booking.propertyId._id].totalNights += nights;
        acc[booking.propertyId._id].bookings.push({
          guest: booking.guestId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          nights
        });
        
        return acc;
      }, {});

      const report = Object.values(occupancyData).map(data => ({
        property: data.property,
        totalNights: data.totalNights,
        occupancyRate: ((data.totalNights / totalDays) * 100).toFixed(2),
        bookingsCount: data.bookings.length,
        bookings: data.bookings
      }));

      const overallOccupancyRate = totalProperties > 0 ? 
        (Object.values(occupancyData).reduce((sum, data) => sum + data.totalNights, 0) / (totalProperties * totalDays) * 100).toFixed(2) : 0;

      res.json({
        status: 'success',
        data: {
          period: { startDate, endDate, totalDays },
          overallOccupancyRate,
          totalProperties,
          propertyReports: report
        }
      });
    } catch (error) {
      console.error('Generate occupancy report error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Generate revenue report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateRevenueReport(req, res) {
    try {
      const { startDate, endDate, propertyId, groupBy = 'monthly' } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          status: 'error',
          message: 'Start date and end date are required'
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const filter = {
        date: { $gte: start, $lte: end }
      };

      if (propertyId) filter.propertyId = propertyId;

      // Group by period
      let groupFormat;
      switch (groupBy) {
        case 'daily':
          groupFormat = '%Y-%m-%d';
          break;
        case 'weekly':
          groupFormat = '%Y-%U';
          break;
        case 'monthly':
        default:
          groupFormat = '%Y-%m';
          break;
      }

      const revenueData = await Revenue.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: groupFormat, date: '$date' } },
              type: '$type'
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.period': 1, '_id.type': 1 } }
      ]);

      // Revenue by property
      const revenueByProperty = await Revenue.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$propertyId',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $lookup: { from: 'properties', localField: '_id', foreignField: '_id', as: 'property' } },
        { $unwind: '$property' },
        { $project: { total: 1, count: 1, propertyName: '$property.name', propertyAddress: '$property.address' } }
      ]);

      // Total revenue
      const totalRevenue = await Revenue.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      res.json({
        status: 'success',
        data: {
          period: { startDate, endDate },
          groupBy,
          totalRevenue: totalRevenue[0]?.total || 0,
          timeSeriesData: revenueData,
          revenueByProperty
        }
      });
    } catch (error) {
      console.error('Generate revenue report error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Generate guest analytics report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateGuestReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          status: 'error',
          message: 'Start date and end date are required'
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      // New guests in period
      const newGuests = await Guest.countDocuments({
        createdAt: { $gte: start, $lte: end }
      });

      // Guests by nationality
      const guestsByNationality = await Guest.aggregate([
        { $group: { _id: '$nationality', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Repeat guests (guests with more than one booking)
      const repeatGuests = await Guest.aggregate([
        { $match: { totalBookings: { $gt: 1 } } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]);

      // Average guest spending
      const averageSpending = await Guest.aggregate([
        { $group: { _id: null, average: { $avg: '$totalSpent' } } }
      ]);

      // Top spending guests
      const topSpendingGuests = await Guest.find()
        .sort({ totalSpent: -1 })
        .limit(10)
        .select('firstName lastName email totalSpent totalBookings');

      res.json({
        status: 'success',
        data: {
          period: { startDate, endDate },
          newGuests,
          repeatGuests: repeatGuests[0]?.count || 0,
          averageSpending: averageSpending[0]?.average || 0,
          guestsByNationality,
          topSpendingGuests
        }
      });
    } catch (error) {
      console.error('Generate guest report error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Generate task performance report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateTaskReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          status: 'error',
          message: 'Start date and end date are required'
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Tasks by status
      const tasksByStatus = await Task.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      // Tasks by category
      const tasksByCategory = await Task.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);

      // Tasks by priority
      const tasksByPriority = await Task.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]);

      // Overdue tasks
      const overdueTasks = await Task.countDocuments({
        createdAt: { $gte: start, $lte: end },
        dueDate: { $lt: new Date() },
        status: { $ne: 'completed' }
      });

      // Average completion time for completed tasks
      const completionTimes = await Task.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            status: 'completed',
            completedAt: { $ne: null }
          }
        },
        {
          $project: {
            completionTime: {
              $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 1000 * 60 * 60] // hours
            }
          }
        },
        {
          $group: {
            _id: null,
            averageHours: { $avg: '$completionTime' }
          }
        }
      ]);

      res.json({
        status: 'success',
        data: {
          period: { startDate, endDate },
          tasksByStatus,
          tasksByCategory,
          tasksByPriority,
          overdueTasks,
          averageCompletionTime: completionTimes[0]?.averageHours || 0
        }
      });
    } catch (error) {
      console.error('Generate task report error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Export report data as CSV format
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportReport(req, res) {
    try {
      const { type, startDate, endDate, propertyId } = req.query;
      
      if (!type || !startDate || !endDate) {
        return res.status(400).json({
          status: 'error',
          message: 'Report type, start date and end date are required'
        });
      }

      let reportData;
      let filename;

      switch (type) {
        case 'bookings':
          const bookings = await Booking.find({
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
            ...(propertyId && { propertyId })
          })
          .populate('propertyId', 'name address')
          .populate('guestId', 'firstName lastName email');
          
          reportData = bookings.map(booking => ({
            'Booking ID': booking._id,
            'Property': booking.propertyId?.name || 'N/A',
            'Guest': `${booking.guestId?.firstName} ${booking.guestId?.lastName}`,
            'Check In': booking.checkIn.toISOString().split('T')[0],
            'Check Out': booking.checkOut.toISOString().split('T')[0],
            'Status': booking.status,
            'Total Amount': booking.totalAmount,
            'Source': booking.source
          }));
          filename = `bookings_report_${startDate}_${endDate}.csv`;
          break;

        case 'revenue':
          const revenue = await Revenue.find({
            date: { $gte: new Date(startDate), $lte: new Date(endDate) },
            ...(propertyId && { propertyId })
          }).populate('propertyId', 'name address');
          
          reportData = revenue.map(item => ({
            'Date': item.date.toISOString().split('T')[0],
            'Property': item.propertyId?.name || 'N/A',
            'Type': item.type,
            'Amount': item.amount,
            'Currency': item.currency,
            'Description': item.description || 'N/A'
          }));
          filename = `revenue_report_${startDate}_${endDate}.csv`;
          break;

        default:
          return res.status(400).json({
            status: 'error',
            message: 'Invalid report type'
          });
      }

      // Convert to CSV format
      if (reportData.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'No data found for the specified criteria'
        });
      }

      const csvHeaders = Object.keys(reportData[0]).join(',');
      const csvRows = reportData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(',')
      ).join('\n');
      
      const csvContent = `${csvHeaders}\n${csvRows}`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Export report error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new ReportsController();
