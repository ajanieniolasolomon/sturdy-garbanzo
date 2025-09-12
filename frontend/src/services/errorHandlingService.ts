// Error Handling Service for CCMIS
import { addNotification } from '../store/slices/uiSlice';
import type { AppDispatch } from '../store';

export interface ErrorInfo {
  code?: string;
  message: string;
  details?: any;
  timestamp: string;
  userId?: string;
  action?: string;
}

class ErrorHandlingService {
  private dispatch: AppDispatch | null = null;

  setDispatch(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  private logError(error: ErrorInfo) {
    console.error('CCMIS Error:', error);
    
    // In production, you would send this to an error tracking service
    // like Sentry, LogRocket, or Bugsnag
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error);
    }
  }

  private getUserFriendlyMessage(error: any): string {
    // Firebase Auth errors
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          return 'No user found with this email address';
        case 'auth/wrong-password':
          return 'Incorrect password';
        case 'auth/email-already-in-use':
          return 'Email address is already in use';
        case 'auth/weak-password':
          return 'Password is too weak. Please choose a stronger password';
        case 'auth/invalid-email':
          return 'Invalid email address format';
        case 'auth/user-disabled':
          return 'This account has been disabled';
        case 'auth/too-many-requests':
          return 'Too many failed attempts. Please try again later';
        case 'auth/network-request-failed':
          return 'Network error. Please check your internet connection';
        case 'auth/requires-recent-login':
          return 'Please log in again to complete this action';
        
        // Firestore errors
        case 'permission-denied':
          return 'You do not have permission to perform this action';
        case 'unavailable':
          return 'Service temporarily unavailable. Please try again';
        case 'deadline-exceeded':
          return 'Request timed out. Please try again';
        case 'resource-exhausted':
          return 'Too many requests. Please wait and try again';
        case 'failed-precondition':
          return 'Operation failed due to a precondition';
        case 'aborted':
          return 'Operation was aborted. Please try again';
        case 'out-of-range':
          return 'Value is out of range';
        case 'unimplemented':
          return 'This feature is not yet implemented';
        case 'internal':
          return 'Internal server error. Please try again';
        case 'data-loss':
          return 'Data loss occurred. Please contact support';
        case 'unauthenticated':
          return 'You must be logged in to perform this action';
        
        // Storage errors
        case 'storage/object-not-found':
          return 'File not found';
        case 'storage/bucket-not-found':
          return 'Storage bucket not found';
        case 'storage/project-not-found':
          return 'Project not found';
        case 'storage/quota-exceeded':
          return 'Storage quota exceeded';
        case 'storage/unauthenticated':
          return 'You must be logged in to upload files';
        case 'storage/unauthorized':
          return 'You do not have permission to upload files';
        case 'storage/retry-limit-exceeded':
          return 'Upload failed after multiple attempts';
        case 'storage/invalid-checksum':
          return 'File upload failed due to corruption';
        case 'storage/canceled':
          return 'Upload was canceled';
        case 'storage/invalid-event-name':
          return 'Invalid upload event';
        case 'storage/invalid-url':
          return 'Invalid file URL';
        case 'storage/invalid-argument':
          return 'Invalid upload parameters';
        case 'storage/no-default-bucket':
          return 'No default storage bucket configured';
        case 'storage/cannot-slice-blob':
          return 'File cannot be processed';
        case 'storage/server-file-wrong-size':
          return 'File size mismatch';
        
        default:
          return error.message || 'An unexpected error occurred';
      }
    }

    // Generic error messages
    if (error.message) {
      if (error.message.includes('network')) {
        return 'Network error. Please check your internet connection';
      }
      if (error.message.includes('timeout')) {
        return 'Request timed out. Please try again';
      }
      if (error.message.includes('permission')) {
        return 'You do not have permission to perform this action';
      }
      return error.message;
    }

    return 'An unexpected error occurred. Please try again';
  }

  handleError(error: any, action?: string, showNotification: boolean = true) {
    const errorInfo: ErrorInfo = {
      code: error.code,
      message: this.getUserFriendlyMessage(error),
      details: error,
      timestamp: new Date().toISOString(),
      action
    };

    this.logError(errorInfo);

    if (showNotification && this.dispatch) {
      this.dispatch(addNotification({
        type: 'error',
        message: errorInfo.message
      }));
    }

    return errorInfo;
  }

  handleSuccess(message: string, showNotification: boolean = true) {
    if (showNotification && this.dispatch) {
      this.dispatch(addNotification({
        type: 'success',
        message
      }));
    }
  }

  handleWarning(message: string, showNotification: boolean = true) {
    if (showNotification && this.dispatch) {
      this.dispatch(addNotification({
        type: 'warning',
        message
      }));
    }
  }

  handleInfo(message: string, showNotification: boolean = true) {
    if (showNotification && this.dispatch) {
      this.dispatch(addNotification({
        type: 'info',
        message
      }));
    }
  }

  // Specific error handlers for common operations
  handleAuthError(error: any) {
    return this.handleError(error, 'authentication');
  }

  handleFirestoreError(error: any, operation: string) {
    return this.handleError(error, `firestore_${operation}`);
  }

  handleStorageError(error: any, operation: string) {
    return this.handleError(error, `storage_${operation}`);
  }

  handleValidationError(errors: Record<string, string>) {
    const firstError = Object.values(errors)[0];
    if (firstError && this.dispatch) {
      this.dispatch(addNotification({
        type: 'error',
        message: firstError
      }));
    }
  }

  // Network error detection
  isNetworkError(error: any): boolean {
    return (
      error.code === 'auth/network-request-failed' ||
      error.code === 'unavailable' ||
      error.message?.includes('network') ||
      error.message?.includes('fetch') ||
      !navigator.onLine
    );
  }

  // Retry logic for network errors
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!this.isNetworkError(error) || attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError;
  }
}

// Create singleton instance
const errorHandlingService = new ErrorHandlingService();
export default errorHandlingService;
