const Notification = require('../models/Notification');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');
const { sendPushNotification } = require('./pushService');

class NotificationService {
  constructor(io) {
    this.io = io;
    this.notificationQueue = [];
    this.isProcessing = false;
  }

  // Create and send notification
  async createNotification(notificationData) {
    try {
      // Create notification record
      const notification = await Notification.createSystemNotification(notificationData);
      
      // Add to processing queue
      this.notificationQueue.push(notification);
      
      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processNotificationQueue();
      }
      
      logger.info(`Notification created: ${notification._id} for user ${notification.recipient.userId}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  // Process notification queue
  async processNotificationQueue() {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    try {
      while (this.notificationQueue.length > 0) {
        const notification = this.notificationQueue.shift();
        await this.processNotification(notification);
      }
    } catch (error) {
      logger.error('Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process individual notification
  async processNotification(notification) {
    try {
      // Get recipient user
      const user = await User.findById(notification.recipient.userId);
      if (!user) {
        logger.warn(`User not found for notification: ${notification._id}`);
        await notification.markAsFailed();
        return;
      }

      // Send in-app notification
      if (notification.delivery.inApp) {
        await this.sendInAppNotification(notification, user);
      }

      // Send email notification
      if (notification.delivery.email && user.email) {
        await this.sendEmailNotification(notification, user);
      }

      // Send push notification
      if (notification.delivery.push && user.pushToken) {
        await this.sendPushNotification(notification, user);
      }

      // Send SMS notification
      if (notification.delivery.sms && user.phoneNumber) {
        await this.sendSMSNotification(notification, user);
      }

      // Mark as sent
      await notification.markAsSent();
      
      logger.info(`Notification processed successfully: ${notification._id}`);
    } catch (error) {
      logger.error(`Error processing notification ${notification._id}:`, error);
      await notification.markAsFailed();
    }
  }

  // Send in-app notification via Socket.IO
  async sendInAppNotification(notification, user) {
    try {
      const hospitalRoom = `hospital-${notification.recipient.hospitalId}`;
      
      // Emit to specific user
      this.io.to(`user-${user._id}`).emit('notification:new', {
        type: 'notification:new',
        data: {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          category: notification.category,
          data: notification.data,
          createdAt: notification.createdAt,
          age: notification.age
        }
      });

      // Emit to hospital room for real-time updates
      this.io.to(hospitalRoom).emit('notification:broadcast', {
        type: 'notification:broadcast',
        data: {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          category: notification.category,
          timestamp: new Date()
        }
      });

      await notification.markAsDelivered();
      logger.info(`In-app notification sent: ${notification._id}`);
    } catch (error) {
      logger.error(`Error sending in-app notification ${notification._id}:`, error);
      throw error;
    }
  }

  // Send email notification
  async sendEmailNotification(notification, user) {
    try {
      const emailData = {
        to: user.email,
        subject: notification.title,
        template: this.getEmailTemplate(notification.type),
        context: {
          userName: user.firstName,
          notification: notification,
          hospitalName: user.hospitalName || 'CCMIS'
        }
      };

      await sendEmail(emailData);
      logger.info(`Email notification sent: ${notification._id} to ${user.email}`);
    } catch (error) {
      logger.error(`Error sending email notification ${notification._id}:`, error);
      throw error;
    }
  }

  // Send push notification
  async sendPushNotification(notification, user) {
    try {
      const pushData = {
        token: user.pushToken,
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification._id.toString(),
          type: notification.type,
          category: notification.category,
          priority: notification.priority
        }
      };

      await sendPushNotification(pushData);
      logger.info(`Push notification sent: ${notification._id} to ${user._id}`);
    } catch (error) {
      logger.error(`Error sending push notification ${notification._id}:`, error);
      throw error;
    }
  }

  // Send SMS notification
  async sendSMSNotification(notification, user) {
    try {
      const smsData = {
        to: user.phoneNumber,
        message: `${notification.title}: ${notification.message}`,
        from: 'CCMIS'
      };

      await sendSMS(smsData);
      logger.info(`SMS notification sent: ${notification._id} to ${user.phoneNumber}`);
    } catch (error) {
      logger.error(`Error sending SMS notification ${notification._id}:`, error);
      throw error;
    }
  }

  // Get email template based on notification type
  getEmailTemplate(notificationType) {
    const templates = {
      'patient:created': 'patient-created',
      'patient:updated': 'patient-updated',
      'patient:removed': 'patient-removed',
      'patient:restored': 'patient-restored',
      'consultation:scheduled': 'consultation-scheduled',
      'consultation:updated': 'consultation-updated',
      'consultation:cancelled': 'consultation-cancelled',
      'task:assigned': 'task-assigned',
      'task:completed': 'task-completed',
      'task:overdue': 'task-overdue',
      'system:maintenance': 'system-maintenance',
      'system:update': 'system-update',
      'security:alert': 'security-alert',
      'sync:completed': 'sync-completed',
      'sync:failed': 'sync-failed'
    };

    return templates[notificationType] || 'default';
  }

  // Send bulk notifications
  async sendBulkNotifications(notifications) {
    try {
      const results = await Promise.allSettled(
        notifications.map(notification => this.createNotification(notification))
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      logger.info(`Bulk notifications sent: ${successful} successful, ${failed} failed`);
      
      return {
        successful,
        failed,
        results
      };
    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  // Send notification to all users in hospital
  async sendHospitalNotification(hospitalId, notificationData) {
    try {
      const users = await User.find({ hospitalId, isActive: true });
      
      const notifications = users.map(user => ({
        ...notificationData,
        recipient: {
          userId: user._id,
          hospitalId: hospitalId
        }
      }));

      return await this.sendBulkNotifications(notifications);
    } catch (error) {
      logger.error(`Error sending hospital notification to ${hospitalId}:`, error);
      throw error;
    }
  }

  // Send notification to specific user group
  async sendGroupNotification(userIds, hospitalId, notificationData) {
    try {
      const notifications = userIds.map(userId => ({
        ...notificationData,
        recipient: {
          userId,
          hospitalId
        }
      }));

      return await this.sendBulkNotifications(notifications);
    } catch (error) {
      logger.error(`Error sending group notification:`, error);
      throw error;
    }
  }

  // Create patient-related notifications
  async createPatientNotification(type, patient, hospitalId, userId = null) {
    const notificationData = {
      type,
      title: this.getPatientNotificationTitle(type, patient),
      message: this.getPatientNotificationMessage(type, patient),
      data: {
        patientId: patient._id,
        patientName: patient.fullName,
        patientId: patient.patientId,
        ccNumber: patient.ccNumber,
        location: `${patient.lga}, ${patient.state}, ${patient.country}`,
        age: patient.age,
        gender: patient.gender
      },
      priority: this.getPatientNotificationPriority(type),
      category: this.getPatientNotificationCategory(type),
      delivery: {
        inApp: true,
        email: type === 'patient:created' || type === 'patient:removed',
        push: type === 'patient:removed',
        sms: false
      }
    };

    if (userId) {
      // Send to specific user
      notificationData.recipient = { userId, hospitalId };
      return await this.createNotification(notificationData);
    } else {
      // Send to all users in hospital
      return await this.sendHospitalNotification(hospitalId, notificationData);
    }
  }

  // Get patient notification title
  getPatientNotificationTitle(type, patient) {
    const titles = {
      'patient:created': `New Patient: ${patient.fullName}`,
      'patient:updated': `Patient Updated: ${patient.fullName}`,
      'patient:removed': `Patient Removed: ${patient.fullName}`,
      'patient:restored': `Patient Restored: ${patient.fullName}`
    };
    return titles[type] || 'Patient Notification';
  }

  // Get patient notification message
  getPatientNotificationMessage(type, patient) {
    const location = `${patient.lga}, ${patient.state}, ${patient.country}`;
    const phoneInfo = patient.phoneNumber ? ` (Phone: ${patient.phoneNumber})` : ' (No phone number)';
    
    const messages = {
      'patient:created': `A new patient ${patient.fullName} (CC: ${patient.ccNumber}) has been registered. Location: ${location}${phoneInfo}`,
      'patient:updated': `Patient ${patient.fullName} (CC: ${patient.ccNumber}) information has been updated. Location: ${location}${phoneInfo}`,
      'patient:removed': `Patient ${patient.fullName} (CC: ${patient.ccNumber}) has been completely removed from the system. Location: ${location}${phoneInfo}`,
      'patient:restored': `Patient ${patient.fullName} (CC: ${patient.ccNumber}) has been restored to the system. Location: ${location}${phoneInfo}`
    };
    return messages[type] || 'Patient information has changed.';
  }

  // Get patient notification priority
  getPatientNotificationPriority(type) {
    const priorities = {
      'patient:created': 'normal',
      'patient:updated': 'low',
      'patient:removed': 'high',
      'patient:restored': 'normal'
    };
    return priorities[type] || 'normal';
  }

  // Get patient notification category
  getPatientNotificationCategory(type) {
    const categories = {
      'patient:created': 'success',
      'patient:updated': 'info',
      'patient:removed': 'warning',
      'patient:restored': 'success'
    };
    return categories[type] || 'info';
  }

  // Handle user connection for real-time notifications
  handleUserConnection(userId, hospitalId, socket) {
    // Join user-specific room
    socket.join(`user-${userId}`);
    
    // Join hospital room
    socket.join(`hospital-${hospitalId}`);
    
    logger.info(`User ${userId} connected to notification service`);
  }

  // Handle user disconnection
  handleUserDisconnection(userId) {
    logger.info(`User ${userId} disconnected from notification service`);
  }
}

module.exports = NotificationService;
