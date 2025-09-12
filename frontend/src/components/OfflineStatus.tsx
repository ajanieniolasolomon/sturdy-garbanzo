import React, { useState, useEffect } from 'react';
import { offlineService } from '../services/offlineService';
import { 
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncTime: number | null;
}

const OfflineStatus: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(offlineService.getSyncStatus());

  useEffect(() => {
    const unsubscribe = offlineService.onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getStatusColor = (): string => {
    if (!syncStatus.isOnline) return 'text-red-600 bg-red-50';
    if (syncStatus.isSyncing) return 'text-yellow-600 bg-yellow-50';
    if (syncStatus.pendingOperations > 0) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) {
      return <ExclamationTriangleIcon className="h-4 w-4" />;
    }
    if (syncStatus.isSyncing) {
      return <ArrowPathIcon className="h-4 w-4 animate-spin" />;
    }
    if (syncStatus.pendingOperations > 0) {
      return <ExclamationTriangleIcon className="h-4 w-4" />;
    }
    return <CheckCircleIcon className="h-4 w-4" />;
  };

  const getStatusText = (): string => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.isSyncing) return 'Syncing...';
    if (syncStatus.pendingOperations > 0) return `${syncStatus.pendingOperations} pending`;
    return 'Synced';
  };

  const handleForceSync = async () => {
    if (syncStatus.isOnline && syncStatus.pendingOperations > 0) {
      await offlineService.forceSync();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg border ${getStatusColor()}`}>
        {getStatusIcon()}
        <div className="flex flex-col">
          <span className="text-sm font-medium">{getStatusText()}</span>
          {syncStatus.isOnline && (
            <span className="text-xs opacity-75">
              Last sync: {formatLastSync(syncStatus.lastSyncTime)}
            </span>
          )}
        </div>
        {syncStatus.isOnline && syncStatus.pendingOperations > 0 && (
          <button
            onClick={handleForceSync}
            className="ml-2 p-1 rounded hover:bg-white/20 transition-colors"
            title="Force sync now"
          >
            <ArrowPathIcon className="h-3 w-3" />
          </button>
        )}
      </div>
      
      {/* Detailed status for offline mode */}
      {!syncStatus.isOnline && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg max-w-xs">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Working Offline</h4>
              <p className="text-xs text-red-700 mt-1">
                Your changes are saved locally and will sync when you're back online.
              </p>
              {syncStatus.pendingOperations > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {syncStatus.pendingOperations} operations pending sync
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineStatus;
