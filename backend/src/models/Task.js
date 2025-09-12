const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: [true, 'Hospital is required']
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assigned user is required']
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  completedDate: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [String],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderDate: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  if (this.status === 'COMPLETED' || this.status === 'CANCELLED') return false;
  return new Date() > this.dueDate;
});

// Virtual for days until due
taskSchema.virtual('daysUntilDue').get(function() {
  if (this.status === 'COMPLETED' || this.status === 'CANCELLED') return null;
  const now = new Date();
  const diffTime = this.dueDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for completion time
taskSchema.virtual('completionTime').get(function() {
  if (!this.completedDate) return null;
  const diffTime = this.completedDate - this.createdAt;
  return Math.round(diffTime / (1000 * 60 * 60 * 24)); // days
});

// Index for better performance
taskSchema.index({ hospitalId: 1 });
taskSchema.index({ patientId: 1 });
taskSchema.index({ userId: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ isActive: 1 });

// Update completion date when status changes to completed
taskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'COMPLETED' && !this.completedDate) {
    this.completedDate = new Date();
    this.completedBy = this.userId;
  }
  next();
});

// Check if task needs reminder
taskSchema.methods.needsReminder = function() {
  if (this.status === 'COMPLETED' || this.status === 'CANCELLED') return false;
  if (this.reminderSent) return false;
  if (!this.reminderDate) return false;
  return new Date() >= this.reminderDate;
};

// Mark reminder as sent
taskSchema.methods.markReminderSent = function() {
  this.reminderSent = true;
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('Task', taskSchema);