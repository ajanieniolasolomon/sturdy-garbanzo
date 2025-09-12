const mongoose = require('mongoose');

const syncQueueSchema = new mongoose.Schema({
  queueId: {
    type: String,
    required: [true, 'Queue ID is required'],
    unique: true,
    trim: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: [true, 'Hospital ID is required'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  entityType: {
    type: String,
    required: [true, 'Entity type is required'],
    enum: {
      values: ['PATIENT', 'CONSULTATION', 'TASK', 'USER', 'HOSPITAL'],
      message: 'Entity type must be PATIENT, CONSULTATION, TASK, USER, or HOSPITAL'
    },
    index: true
  },
  entityId: {
    type: String,
    required: [true, 'Entity ID is required'],
    index: true
  },
  operation: {
    type: String,
    required: [true, 'Operation is required'],
    enum: {
      values: ['CREATE', 'UPDATE', 'DELETE'],
      message: 'Operation must be CREATE, UPDATE, or DELETE'
    },
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Data is required']
  },
  originalData: {
    type: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CONFLICT'],
      message: 'Status must be PENDING, PROCESSING, COMPLETED, FAILED, or CONFLICT'
    },
    default: 'PENDING',
    index: true
  },
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: {
      values: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT'
    },
    default: 'MEDIUM',
    index: true
  },
  retryCount: {
    type: Number,
    default: 0,
    min: [0, 'Retry count cannot be negative'],
    max: [10, 'Maximum retry count is 10']
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: [1, 'Max retries must be at least 1'],
    max: [10, 'Max retries cannot exceed 10']
  },
  lastRetryAt: {
    type: Date
  },
  nextRetryAt: {
    type: Date,
    index: true
  },
  error: {
    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Error message cannot exceed 500 characters']
    },
    code: {
      type: String,
      trim: true,
      maxlength: [50, 'Error code cannot exceed 50 characters']
    },
    stack: {
      type: String,
      trim: true,
      maxlength: [2000, 'Error stack cannot exceed 2000 characters']
    },
    timestamp: {
      type: Date
    }
  },
  conflictResolution: {
    strategy: {
      type: String,
      enum: ['SERVER_WINS', 'CLIENT_WINS', 'MERGE', 'MANUAL'],
      default: 'SERVER_WINS'
    },
    resolvedAt: {
      type: Date
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolution: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  metadata: {
    clientVersion: {
      type: String,
      trim: true,
      maxlength: [20, 'Client version cannot exceed 20 characters']
    },
    deviceId: {
      type: String,
      trim: true,
      maxlength: [100, 'Device ID cannot exceed 100 characters']
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: [500, 'User agent cannot exceed 500 characters']
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: [45, 'IP address cannot exceed 45 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  dependencies: [{
    entityType: {
      type: String,
      enum: ['PATIENT', 'CONSULTATION', 'TASK', 'USER', 'HOSPITAL']
    },
    entityId: {
      type: String
    },
    operation: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE']
    }
  }],
  completedAt: {
    type: Date
  },
  processedAt: {
    type: Date
  },
  estimatedProcessTime: {
    type: Number, // in milliseconds
    default: 1000
  },
  actualProcessTime: {
    type: Number // in milliseconds
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for retry delay calculation
syncQueueSchema.virtual('retryDelay').get(function() {
  // Exponential backoff: 2^retryCount * 1000ms (1s, 2s, 4s, 8s, etc.)
  return Math.pow(2, this.retryCount) * 1000;
});

// Virtual for can retry
syncQueueSchema.virtual('canRetry').get(function() {
  return this.retryCount < this.maxRetries && this.status === 'FAILED';
});

// Virtual for is ready for processing
syncQueueSchema.virtual('isReadyForProcessing').get(function() {
  if (this.status !== 'PENDING' && this.status !== 'FAILED') return false;
  if (this.nextRetryAt && new Date() < this.nextRetryAt) return false;
  return true;
});

// Indexes for performance
syncQueueSchema.index({ queueId: 1 });
syncQueueSchema.index({ hospitalId: 1, status: 1, priority: -1, createdAt: 1 });
syncQueueSchema.index({ userId: 1, status: 1 });
syncQueueSchema.index({ entityType: 1, entityId: 1 });
syncQueueSchema.index({ status: 1, nextRetryAt: 1 });
syncQueueSchema.index({ priority: -1, createdAt: 1 });
syncQueueSchema.index({ isActive: 1 });

// Generate queue ID
syncQueueSchema.pre('save', function(next) {
  if (!this.queueId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);
    this.queueId = `sync_${timestamp}_${random}`;
  }
  next();
});

// Calculate next retry time
syncQueueSchema.pre('save', function(next) {
  if (this.isModified('retryCount') && this.status === 'FAILED') {
    const delay = this.retryDelay;
    this.nextRetryAt = new Date(Date.now() + delay);
  }
  next();
});

// Mark as completed
syncQueueSchema.methods.markCompleted = function(processTime = null) {
  this.status = 'COMPLETED';
  this.completedAt = new Date();
  this.processedAt = new Date();
  if (processTime) {
    this.actualProcessTime = processTime;
  }
  return this.save();
};

// Mark as failed
syncQueueSchema.methods.markFailed = function(error) {
  this.status = 'FAILED';
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  
  if (error) {
    this.error = {
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN',
      stack: error.stack || '',
      timestamp: new Date()
    };
  }

  // If max retries exceeded, mark as permanently failed
  if (this.retryCount >= this.maxRetries) {
    this.status = 'FAILED';
    this.nextRetryAt = null;
  }

  return this.save();
};

// Mark as conflict
syncQueueSchema.methods.markConflict = function(conflictData) {
  this.status = 'CONFLICT';
  this.originalData = conflictData;
  return this.save();
};

// Resolve conflict
syncQueueSchema.methods.resolveConflict = function(resolution, resolvedBy, strategy = 'SERVER_WINS') {
  this.status = 'PENDING';
  this.conflictResolution = {
    strategy,
    resolvedAt: new Date(),
    resolvedBy,
    resolution
  };
  this.data = resolution;
  this.retryCount = 0;
  this.nextRetryAt = null;
  return this.save();
};

// Get queue summary
syncQueueSchema.methods.getSummary = function() {
  return {
    id: this._id,
    queueId: this.queueId,
    entityType: this.entityType,
    entityId: this.entityId,
    operation: this.operation,
    status: this.status,
    priority: this.priority,
    retryCount: this.retryCount,
    canRetry: this.canRetry,
    isReadyForProcessing: this.isReadyForProcessing,
    createdAt: this.createdAt,
    nextRetryAt: this.nextRetryAt
  };
};

// Static method to get pending items
syncQueueSchema.statics.getPending = async function(hospitalId, options = {}) {
  const {
    limit = 10,
    entityType = null,
    priority = null,
    userId = null
  } = options;

  const filter = {
    hospitalId,
    isActive: true,
    $or: [
      { status: 'PENDING' },
      { 
        status: 'FAILED',
        retryCount: { $lt: mongoose.Schema.Types.Mixed },
        $or: [
          { nextRetryAt: { $lte: new Date() } },
          { nextRetryAt: null }
        ]
      }
    ]
  };

  if (entityType) filter.entityType = entityType;
  if (priority) filter.priority = priority;
  if (userId) filter.userId = userId;

  return await this.find(filter)
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .populate('userId', 'firstName lastName')
    .lean();
};

// Static method to get statistics
syncQueueSchema.statics.getStats = async function(hospitalId, options = {}) {
  const { userId, entityType } = options;
  
  const matchFilter = { hospitalId: new mongoose.Types.ObjectId(hospitalId), isActive: true };
  if (userId) matchFilter.userId = new mongoose.Types.ObjectId(userId);
  if (entityType) matchFilter.entityType = entityType;

  const stats = await this.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
        processing: { $sum: { $cond: [{ $eq: ['$status', 'PROCESSING'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
        conflict: { $sum: { $cond: [{ $eq: ['$status', 'CONFLICT'] }, 1, 0] } },
        avgProcessTime: { $avg: '$actualProcessTime' }
      }
    }
  ]);

  const operationStats = await this.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$operation',
        count: { $sum: 1 }
      }
    }
  ]);

  const entityStats = await this.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$entityType',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    overview: stats[0] || {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      conflict: 0,
      avgProcessTime: 0
    },
    byOperation: operationStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
    byEntity: entityStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {})
  };
};

// Static method to cleanup old completed items
syncQueueSchema.statics.cleanup = async function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
  
  const result = await this.deleteMany({
    status: 'COMPLETED',
    completedAt: { $lt: cutoffDate }
  });

  return result.deletedCount;
};

module.exports = mongoose.model('SyncQueue', syncQueueSchema);
