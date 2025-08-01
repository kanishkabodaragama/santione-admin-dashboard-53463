const { body, query, param } = require('express-validator');

// Authentication validators
const loginValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const registerValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name is required'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'staff'])
    .withMessage('Invalid role')
];

// Property validators
const propertyValidator = [
  body('name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Property name is required'),
  body('address')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Property address is required'),
  body('type')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Property type is required'),
  body('bedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bedrooms must be a positive integer'),
  body('guests')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Guest capacity must be at least 1'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'maintenance'])
    .withMessage('Invalid status')
];

// Booking validators
const bookingValidator = [
  body('propertyId')
    .isMongoId()
    .withMessage('Valid property ID is required'),
  body('guestId')
    .isMongoId()
    .withMessage('Valid guest ID is required'),
  body('checkIn')
    .isISO8601()
    .withMessage('Valid check-in date is required'),
  body('checkOut')
    .isISO8601()
    .withMessage('Valid check-out date is required'),
  body('totalAmount')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),
  body('source')
    .isIn(['direct', 'airbnb', 'booking.com', 'vrbo'])
    .withMessage('Invalid booking source'),
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'])
    .withMessage('Invalid booking status')
];

// Guest validators
const guestValidator = [
  body('firstName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name is required'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('nationality')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Nationality must be at least 2 characters')
];

// Task validators
const taskValidator = [
  body('title')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Task title is required'),
  body('category')
    .isIn(['cleaning', 'maintenance', 'inspection', 'guest-service', 'other'])
    .withMessage('Invalid task category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed', 'cancelled'])
    .withMessage('Invalid task status'),
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Valid user ID is required'),
  body('propertyId')
    .optional()
    .isMongoId()
    .withMessage('Valid property ID is required'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Valid due date is required')
];

// Staff validators
const staffValidator = [
  body('userId')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  body('position')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Position is required'),
  body('department')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Department is required'),
  body('hireDate')
    .optional()
    .isISO8601()
    .withMessage('Valid hire date is required'),
  body('salary')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Salary must be a positive number')
];

// Smart device validators
const deviceValidator = [
  body('propertyId')
    .isMongoId()
    .withMessage('Valid property ID is required'),
  body('deviceType')
    .isIn(['lock', 'camera', 'thermostat', 'sensor'])
    .withMessage('Invalid device type'),
  body('brand')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Brand is required'),
  body('model')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Model is required'),
  body('status')
    .optional()
    .isIn(['online', 'offline', 'maintenance'])
    .withMessage('Invalid device status'),
  body('batteryLevel')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Battery level must be between 0 and 100')
];

// Revenue validators
const revenueValidator = [
  body('propertyId')
    .isMongoId()
    .withMessage('Valid property ID is required'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('type')
    .isIn(['booking', 'cleaning', 'damage', 'refund'])
    .withMessage('Invalid revenue type'),
  body('date')
    .isISO8601()
    .withMessage('Valid date is required'),
  body('bookingId')
    .optional()
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  body('currency')
    .optional()
    .isISO4217()
    .withMessage('Valid currency code is required')
];

// Common validators
const mongoIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Valid ID is required')
];

const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const dateRangeValidator = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required')
];

module.exports = {
  loginValidator,
  registerValidator,
  propertyValidator,
  bookingValidator,
  guestValidator,
  taskValidator,
  staffValidator,
  deviceValidator,
  revenueValidator,
  mongoIdValidator,
  paginationValidator,
  dateRangeValidator
};
