const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  consultationId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: [true, 'Hospital is required']
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Healthcare worker is required']
  },
  consultationDate: {
    type: Date,
    required: [true, 'Consultation date is required'],
    default: Date.now
  },
  type: {
    type: String,
    required: [true, 'Consultation type is required'],
    enum: ['INITIAL', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECK', 'SPECIALIST']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
    default: 'SCHEDULED'
  },
  chiefComplaint: {
    type: String,
    required: [true, 'Chief complaint is required'],
    trim: true,
    maxlength: [500, 'Chief complaint cannot exceed 500 characters']
  },
  historyOfPresentIllness: {
    type: String,
    trim: true,
    maxlength: [2000, 'History cannot exceed 2000 characters']
  },
  symptoms: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    severity: {
      type: String,
      enum: ['MILD', 'MODERATE', 'SEVERE'],
      default: 'MILD'
    },
    duration: String,
    notes: String
  }],
  vitalSigns: {
    bloodPressure: {
      systolic: {
        type: Number,
        min: 50,
        max: 300
      },
      diastolic: {
        type: Number,
        min: 30,
        max: 200
      }
    },
    heartRate: {
      type: Number,
      min: 30,
      max: 300
    },
    temperature: {
      type: Number,
      min: 30,
      max: 45
    },
    respiratoryRate: {
      type: Number,
      min: 5,
      max: 60
    },
    oxygenSaturation: {
      type: Number,
      min: 50,
      max: 100
    },
    weight: {
      type: Number,
      min: 0.5,
      max: 500
    },
    height: {
      type: Number,
      min: 30,
      max: 250
    }
  },
  physicalExamination: {
    general: String,
    systems: [{
      system: {
        type: String,
        enum: ['CARDIOVASCULAR', 'RESPIRATORY', 'GASTROINTESTINAL', 'NEUROLOGICAL', 'MUSCULOSKELETAL', 'DERMATOLOGICAL', 'GENITOURINARY', 'ENT', 'OPHTHALMOLOGICAL']
      },
      findings: String
    }]
  },
  diagnosis: {
    primary: {
      type: String,
      required: [true, 'Primary diagnosis is required'],
      trim: true
    },
    secondary: [String],
    differential: [String]
  },
  treatment: {
    plan: {
      type: String,
      required: [true, 'Treatment plan is required'],
      trim: true
    },
    medications: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    procedures: [{
      name: String,
      date: Date,
      notes: String
    }]
  },
  followUp: {
    required: {
      type: Boolean,
      default: false
    },
    date: Date,
    instructions: String
  },
  referral: {
    required: {
      type: Boolean,
      default: false
    },
    to: String,
    reason: String,
    urgency: {
      type: String,
      enum: ['ROUTINE', 'URGENT', 'EMERGENCY'],
      default: 'ROUTINE'
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  syncStatus: {
    type: String,
    enum: ['PENDING', 'SYNCED', 'CONFLICT'],
    default: 'PENDING'
  },
  lastSyncAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for BMI calculation
consultationSchema.virtual('bmi').get(function() {
  if (!this.vitalSigns.weight || !this.vitalSigns.height) return null;
  const heightInMeters = this.vitalSigns.height / 100;
  return Math.round((this.vitalSigns.weight / (heightInMeters * heightInMeters)) * 10) / 10;
});

// Virtual for blood pressure category
consultationSchema.virtual('bloodPressureCategory').get(function() {
  if (!this.vitalSigns.bloodPressure) return null;
  const { systolic, diastolic } = this.vitalSigns.bloodPressure;
  
  if (systolic < 120 && diastolic < 80) return 'Normal';
  if (systolic < 130 && diastolic < 80) return 'Elevated';
  if (systolic < 140 || diastolic < 90) return 'High Blood Pressure Stage 1';
  if (systolic < 180 || diastolic < 120) return 'High Blood Pressure Stage 2';
  return 'Hypertensive Crisis';
});

// Index for better performance
consultationSchema.index({ consultationId: 1 });
consultationSchema.index({ hospitalId: 1 });
consultationSchema.index({ patientId: 1 });
consultationSchema.index({ userId: 1 });
consultationSchema.index({ consultationDate: 1 });
consultationSchema.index({ status: 1 });
consultationSchema.index({ type: 1 });

// Generate consultation ID
consultationSchema.pre('save', function(next) {
  if (!this.consultationId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.consultationId = `CON${year}${month}${day}${random}`;
  }
  next();
});

module.exports = mongoose.model('Consultation', consultationSchema);