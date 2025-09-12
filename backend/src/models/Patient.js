const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [0, 'Age cannot be negative'],
    max: [150, 'Age cannot exceed 150']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['male', 'female', 'other']
  },
  ccNumber: {
    type: String,
    required: [true, 'CC Number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
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
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['new_case', 'on_treatment', 'dead', 'stopped', 'loss_to_follow_up', 'restarted', 'transferred_out', 'transferred_in'],
    default: 'new_case'
  },
  assignedHCW: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assigned HCW is required']
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: [true, 'Hospital is required']
  },
  medicalHistory: [{
    condition: String,
    diagnosis: String,
    treatment: String,
    date: Date,
    notes: String
  }],
  allergies: [{
    allergen: String,
    reaction: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    }
  }],
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    address: String
  },
  insurance: {
    provider: String,
    policyNumber: String,
    expiryDate: Date
  },
  lastVisit: Date,
  nextAppointment: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full address
patientSchema.virtual('fullAddress').get(function() {
  return `${this.address}, ${this.lga}, ${this.state}, ${this.country}`;
});

// Virtual for age group
patientSchema.virtual('ageGroup').get(function() {
  if (this.age < 18) return 'pediatric';
  if (this.age < 65) return 'adult';
  return 'elderly';
});

// Index for better performance
patientSchema.index({ ccNumber: 1 });
patientSchema.index({ fullName: 1 });
patientSchema.index({ hospitalId: 1 });
patientSchema.index({ assignedHCW: 1 });
patientSchema.index({ status: 1 });
patientSchema.index({ state: 1, lga: 1 });

// Update last visit
patientSchema.methods.updateLastVisit = function() {
  this.lastVisit = new Date();
  return this.save({ validateBeforeSave: false });
};

// Check if patient is due for follow-up
patientSchema.methods.isDueForFollowUp = function() {
  if (!this.nextAppointment) return false;
  return new Date() >= this.nextAppointment;
};

module.exports = mongoose.model('Patient', patientSchema);