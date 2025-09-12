const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true,
    maxlength: [100, 'Hospital name cannot exceed 100 characters']
  },
  code: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Hospital code cannot exceed 20 characters']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  lga: {
    type: String,
    required: [true, 'LGA is required'],
    trim: true,
    maxlength: [50, 'LGA cannot exceed 50 characters']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [50, 'State cannot exceed 50 characters']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    enum: ['Nigeria', 'Refugee', 'Others'],
    default: 'Nigeria'
  },
  capacity: {
    type: Number,
    min: [0, 'Capacity cannot be negative'],
    default: 0
  },
  currentPatients: {
    type: Number,
    min: [0, 'Current patients cannot be negative'],
    default: 0
  },
  staffCount: {
    type: Number,
    min: [0, 'Staff count cannot be negative'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  facilities: [{
    name: String,
    available: {
      type: Boolean,
      default: true
    }
  }],
  operatingHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full address
hospitalSchema.virtual('fullAddress').get(function() {
  return `${this.address}, ${this.lga}, ${this.state}, ${this.country}`;
});

// Virtual for utilization rate
hospitalSchema.virtual('utilizationRate').get(function() {
  if (this.capacity === 0) return 0;
  return Math.round((this.currentPatients / this.capacity) * 100);
});

// Index for better performance
hospitalSchema.index({ name: 1 });
hospitalSchema.index({ code: 1 });
hospitalSchema.index({ state: 1, lga: 1 });
hospitalSchema.index({ isActive: 1 });

// Update current patients count
hospitalSchema.methods.updatePatientCount = async function() {
  const Patient = mongoose.model('Patient');
  const count = await Patient.countDocuments({ 
    hospitalId: this._id, 
    status: { $in: ['new_case', 'on_treatment'] } 
  });
  this.currentPatients = count;
  return this.save();
};

// Update staff count
hospitalSchema.methods.updateStaffCount = async function() {
  const User = mongoose.model('User');
  const count = await User.countDocuments({ 
    hospitalId: this._id, 
    isActive: true 
  });
  this.staffCount = count;
  return this.save();
};

module.exports = mongoose.model('Hospital', hospitalSchema);