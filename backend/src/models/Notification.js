const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true
    }
  },
  type: {
    type: String,
    required: true,
    enum: [
      'patient:created',
      'patient:updated',
      'patient:deleted',
      'consultation:scheduled',
      'consultation:updated',
      'consultation:cancelled',
      'task:assigned',
      'task:completed',
      'task:overdue',
      'system:maintenance',
      'system:update',
      'security:alert',
      'sync:completed',
      'sync:failed'
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  category: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  delivery: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
    default: 'pending'
  },
  readAt: {
    type: Date,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiration: 30 days from creation
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  metadata: {
    source: {
      type: String,
      enum: ['system', 'user', 'api', 'webhook'],
      default: 'system'
    },
    sourceId: String,
    tags: [String],
    context: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
notificationSchema.index({ 'recipient.userId': 1, createdAt: -1 });
notificationSchema.index({ 'recipient.hospitalId': 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ 'metadata.tags': 1 });

// Virtual for notification age
notificationSchema.virtual('age').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffMs = now - created;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
});

// Virtual for isExpired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Set sent timestamp when status changes to sent
  if (this.isModified('status') && this.status === 'sent' && !this.sentAt) {
    this.sentAt = new Date();
  }
  
  // Set delivered timestamp when status changes to delivered
  if (this.isModified('status') && this.status === 'delivered' && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }
  
  // Set read timestamp when status changes to read
  if (this.isModified('status') && this.status === 'read' && !this.readAt) {
    this.readAt = new Date();
  }
  
  next();
});

// Static method to create system notification
notificationSchema.statics.createSystemNotification = function(data) {
  return this.create({
    recipient: data.recipient,
    type: data.type,
    title: data.title,
    message: data.message,
    data: data.data || {},
    priority: data.priority || 'normal',
    category: data.category || 'info',
    delivery: data.delivery || { inApp: true },
    metadata: {
      source: 'system',
      sourceId: data.sourceId,
      tags: data.tags || [],
      context: data.context
    }
  });
};

// Static method to create user notification
notificationSchema.statics.createUserNotification = function(data) {
  return this.create({
    recipient: data.recipient,
    type: data.type,
    title: data.title,
    message: data.message,
    data: data.data || {},
    priority: data.priority || 'normal',
    category: data.category || 'info',
    delivery: data.delivery || { inApp: true },
    metadata: {
      source: 'user',
      sourceId: data.sourceId,
      tags: data.tags || [],
      context: data.context
    }
  });
};

// Static method to find unread notifications
notificationSchema.statics.findUnread = function(userId, hospitalId, options = {}) {
  const query = {
    'recipient.userId': userId,
    'recipient.hospitalId': hospitalId,
    status: { $in: ['pending', 'sent', 'delivered'] },
    expiresAt: { $gt: new Date() }
  };
  
  if (options.type) {
    query.type = options.type;
  }
  
  if (options.priority) {
    query.priority = options.priority;
  }
  
  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = function(userId, hospitalId, notificationIds) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      'recipient.userId': userId,
      'recipient.hospitalId': hospitalId
    },
    {
      $set: {
        status: 'read',
        readAt: new Date()
      }
    }
  );
};

// Static method to mark all notifications as read
notificationSchema.statics.markAllAsRead = function(userId, hospitalId) {
  return this.updateMany(
    {
      'recipient.userId': userId,
      'recipient.hospitalId': hospitalId,
      status: { $in: ['pending', 'sent', 'delivered'] }
    },
    {
      $set: {
        status: 'read',
        readAt: new Date()
      }
    }
  );
};

// Static method to get notification statistics
notificationSchema.statics.getStats = function(userId, hospitalId) {
  return this.aggregate([
    {
      $match: {
        'recipient.userId': userId,
        'recipient.hospitalId': hospitalId
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Instance method to mark as sent
notificationSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

// Instance method to mark as delivered
notificationSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

// Instance method to mark as failed
notificationSchema.methods.markAsFailed = function() {
  this.status = 'failed';
  return this.save();
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
