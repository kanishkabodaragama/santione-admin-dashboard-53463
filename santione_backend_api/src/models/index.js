const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  profileImage: String,
  phone: String
}, { timestamps: true });

// Property Schema
const propertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  type: { type: String, required: true }, // apartment, house, villa, etc.
  bedrooms: Number,
  guests: Number,
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
  images: [String],
  amenities: [String],
  pricing: {
    basePrice: Number,
    cleaningFee: Number,
    currency: { type: String, default: 'EUR' }
  },
  location: {
    latitude: Number,
    longitude: Number,
    city: String,
    country: String
  },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Booking Schema
const bookingSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  guestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'], default: 'pending' },
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  source: { type: String, enum: ['direct', 'airbnb', 'booking.com', 'vrbo'], required: true },
  confirmation: String,
  notes: String
}, { timestamps: true });

// Guest Schema
const guestSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  nationality: String,
  identityDocument: String,
  specialRequests: String,
  totalBookings: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 }
}, { timestamps: true });

// Task Schema
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
  dueDate: Date,
  completedAt: Date,
  category: { type: String, enum: ['cleaning', 'maintenance', 'inspection', 'guest-service', 'other'], required: true }
}, { timestamps: true });

// Staff Schema (extends User for additional staff-specific fields)
const staffSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  position: String,
  department: String,
  hireDate: Date,
  salary: Number,
  workSchedule: {
    monday: { start: String, end: String },
    tuesday: { start: String, end: String },
    wednesday: { start: String, end: String },
    thursday: { start: String, end: String },
    friday: { start: String, end: String },
    saturday: { start: String, end: String },
    sunday: { start: String, end: String }
  },
  skills: [String],
  certifications: [String]
}, { timestamps: true });

// Smart Device Schema
const smartDeviceSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  deviceType: { type: String, enum: ['lock', 'camera', 'thermostat', 'sensor'], required: true },
  brand: String,
  model: String,
  serialNumber: String,
  status: { type: String, enum: ['online', 'offline', 'maintenance'], default: 'online' },
  batteryLevel: Number,
  lastSeen: Date,
  settings: mongoose.Schema.Types.Mixed
}, { timestamps: true });

// Revenue Schema
const revenueSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  type: { type: String, enum: ['booking', 'cleaning', 'damage', 'refund'], required: true },
  date: { type: Date, required: true },
  source: String,
  description: String
}, { timestamps: true });

// Create models
const User = mongoose.model('User', userSchema);
const Property = mongoose.model('Property', propertySchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Guest = mongoose.model('Guest', guestSchema);
const Task = mongoose.model('Task', taskSchema);
const Staff = mongoose.model('Staff', staffSchema);
const SmartDevice = mongoose.model('SmartDevice', smartDeviceSchema);
const Revenue = mongoose.model('Revenue', revenueSchema);

module.exports = {
  User,
  Property,
  Booking,
  Guest,
  Task,
  Staff,
  SmartDevice,
  Revenue
};
