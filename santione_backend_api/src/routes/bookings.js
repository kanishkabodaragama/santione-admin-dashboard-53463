const express = require('express');
const bookingsController = require('../controllers/bookings');
const { authenticateToken } = require('../middleware/auth');
const { bookingValidator, mongoIdValidator, paginationValidator, dateRangeValidator } = require('../validators');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Booking ID
 *         propertyId:
 *           type: string
 *           description: Property ID
 *         guestId:
 *           type: string
 *           description: Guest ID
 *         checkIn:
 *           type: string
 *           format: date
 *         checkOut:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [pending, confirmed, checked-in, checked-out, cancelled]
 *         totalAmount:
 *           type: number
 *         currency:
 *           type: string
 *           default: EUR
 *         source:
 *           type: string
 *           enum: [direct, airbnb, booking.com, vrbo]
 *         confirmation:
 *           type: string
 *         notes:
 *           type: string
 */

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get all bookings
 *     description: Retrieve a paginated list of bookings with optional filtering
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, checked-in, checked-out, cancelled]
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [direct, airbnb, booking.com, vrbo]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 */
router.get('/', authenticateToken, paginationValidator, dateRangeValidator, bookingsController.getBookings);

/**
 * @swagger
 * /bookings/stats:
 *   get:
 *     summary: Get booking statistics
 *     description: Retrieve booking statistics and metrics
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Booking statistics retrieved successfully
 */
router.get('/stats', authenticateToken, bookingsController.getBookingStats);

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     description: Retrieve a specific booking by its ID
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *       404:
 *         description: Booking not found
 */
router.get('/:id', authenticateToken, mongoIdValidator, bookingsController.getBooking);

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create new booking
 *     description: Create a new booking reservation
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - guestId
 *               - checkIn
 *               - checkOut
 *               - totalAmount
 *               - source
 *             properties:
 *               propertyId:
 *                 type: string
 *               guestId:
 *                 type: string
 *               checkIn:
 *                 type: string
 *                 format: date
 *               checkOut:
 *                 type: string
 *                 format: date
 *               totalAmount:
 *                 type: number
 *               source:
 *                 type: string
 *                 enum: [direct, airbnb, booking.com, vrbo]
 *               confirmation:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       409:
 *         description: Property not available for selected dates
 *       400:
 *         description: Validation error
 */
router.post('/', authenticateToken, bookingValidator, bookingsController.createBooking);

/**
 * @swagger
 * /bookings/{id}:
 *   put:
 *     summary: Update booking
 *     description: Update an existing booking
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *       404:
 *         description: Booking not found
 */
router.put('/:id', authenticateToken, mongoIdValidator, bookingValidator, bookingsController.updateBooking);

/**
 * @swagger
 * /bookings/{id}/cancel:
 *   patch:
 *     summary: Cancel booking
 *     description: Cancel an existing booking
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       404:
 *         description: Booking not found
 */
router.patch('/:id/cancel', authenticateToken, mongoIdValidator, bookingsController.cancelBooking);

module.exports = router;
