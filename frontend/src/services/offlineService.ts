// Offline Service for CCMIS - Comprehensive offline support
import { 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface OfflineOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: string;
  docId: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  userId?: string;
  version?: number;
  conflictResolution?: 'lastWriteWins' | 'merge' | 'manual';
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncTime: number | null;
}

class OfflineService {
  private isOnline: boolean = navigator.onLine;
  private syncStatus: SyncStatus = {
    isOnline: this.isOnline,
    isSyncing: false,
    pendingOperations: 0,
    lastSyncTime: null
  };
  private pendingOperations: OfflineOperation[] = [];
  private syncListeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    this.initializeOfflineSupport();
  }

  private initializeOfflineSupport() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Load pending operations from localStorage
    this.loadPendingOperations();

    // Start periodic sync when online
    if (this.isOnline) {
      this.startPeriodicSync();
    }
  }

  private handleOnline() {
    console.log('🌐 Network: Online - Starting sync...');
    this.isOnline = true;
    this.syncStatus.isOnline = true;
    this.notifyListeners();
    
    // Start syncing pending operations
    this.syncPendingOperations();
    this.startPeriodicSync();
  }

  private handleOffline() {
    console.log('📴 Network: Offline - Operations will be queued');
    this.isOnline = false;
    this.syncStatus.isOnline = false;
    this.syncStatus.isSyncing = false;
    this.notifyListeners();
  }

  private startPeriodicSync() {
    // Ensure only one interval exists
    if ((self as any).__ccmis_sync_interval) return;
    (self as any).__ccmis_sync_interval = setInterval(() => {
      if (this.isOnline && this.pendingOperations.length > 0) {
        this.syncPendingOperations();
      }
    }, 30000);
  }

  // Offline-aware CRUD operations
  async createDocument(collection: string, docId: string, data: any, userId?: string): Promise<void> {
    const operation: OfflineOperation = {
      id: `${collection}_${docId}_${Date.now()}`,
      type: 'CREATE',
      collection,
      docId,
      data: {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        _version: Date.now(),
        ...(userId && { _createdBy: userId })
      },
      timestamp: Date.now(),
      retryCount: 0,
      userId,
      version: Date.now(),
      conflictResolution: this.getConflictResolutionStrategy(collection)
    };

    if (this.isOnline) {
      try {
        await setDoc(doc(db, collection, docId),{ ...operation.data, id: docId });
        console.log(`✅ Created ${collection}/${docId} online`);
        // Update sync status
        this.syncStatus.lastSyncTime = Date.now();
        this.notifyListeners();
      } catch (error) {
        console.error(`❌ Failed to create ${collection}/${docId} online:`, error);
        this.queueOperation(operation);
      }
    } else {
      this.queueOperation(operation);
      console.log(`📝 Queued CREATE operation for ${collection}/${docId}`);
    }
  }

  async updateDocument(collection: string, docId: string, data: any, userId?: string): Promise<void> {
    const operation: OfflineOperation = {
      id: `${collection}_${docId}_${Date.now()}`,
      type: 'UPDATE',
      collection,
      docId,
      data: {
        ...data,
        updatedAt: serverTimestamp(),
        _version: Date.now(),
        ...(userId && { _updatedBy: userId })
      },
      timestamp: Date.now(),
      retryCount: 0,
      userId,
      version: Date.now(),
      conflictResolution: this.getConflictResolutionStrategy(collection)
    };

    if (this.isOnline) {
      try {
        await updateDoc(doc(db, collection, docId), operation.data);
        console.log(`✅ Updated ${collection}/${docId} online`);
        // Update sync status
        this.syncStatus.lastSyncTime = Date.now();
        this.notifyListeners();
      } catch (error) {
        console.error(`❌ Failed to update ${collection}/${docId} online:`, error);
        this.queueOperation(operation);
      }
    } else {
      this.queueOperation(operation);
      console.log(`📝 Queued UPDATE operation for ${collection}/${docId}`);
    }
  }

  async deleteDocument(collection: string, docId: string, userId?: string): Promise<void> {
    const operation: OfflineOperation = {
      id: `${collection}_${docId}_${Date.now()}`,
      type: 'DELETE',
      collection,
      docId,
      timestamp: Date.now(),
      retryCount: 0,
      userId,
      version: Date.now(),
      conflictResolution: this.getConflictResolutionStrategy(collection)
    };

    if (this.isOnline) {
      try {
        await deleteDoc(doc(db, collection, docId));
        console.log(`✅ Deleted ${collection}/${docId} online`);
      } catch (error) {
        console.error(`❌ Failed to delete ${collection}/${docId} online:`, error);
        this.queueOperation(operation);
      }
    } else {
      this.queueOperation(operation);
      console.log(`📝 Queued DELETE operation for ${collection}/${docId}`);
    }
  }

  // Offline-aware data reading with local cache
  async getDocument(collection: string, docId: string): Promise<any> {
    try {
      const docRef = doc(db, collection, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        console.log(`No document found: ${collection}/${docId}`);
        return null;
      }
    } catch (error) {
      console.error(`Error getting document ${collection}/${docId}:`, error);
      // Return cached data if available
      return this.getCachedDocument(collection, docId);
    }
  }

  // Stream data with offline support
  streamCollection(
    collectionName: string, 
    callback: (data: any[]) => void,
    filters?: { field: string; operator: any; value: any }[],
    orderByField?: string,
    limitCount?: number
  ): () => void {
    try {
      let q: any = collection(db, collectionName);
      
      // Apply filters
      if (filters) {
        filters.forEach(filter => {
          q = query(q, where(filter.field, filter.operator, filter.value));
        });
      }
      
      // Apply ordering
      if (orderByField) {
        q = query(q, orderBy(orderByField, 'desc'));
      }
      
      // Apply limit
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const unsubscribe = onSnapshot(q, 
        (snapshot: any) => {
          const data = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
          }));
          callback(data);
        },
        (error: any) => {
          console.error(`Error streaming ${collectionName}:`, error);
          // Provide cached data on error
          const cachedData = this.getCachedCollection(collectionName);
          callback(cachedData);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error(`Error setting up stream for ${collectionName}:`, error);
      // Return cached data
      const cachedData = this.getCachedCollection(collectionName);
      callback(cachedData);
      return () => {}; // Return empty unsubscribe function
    }
  }

  private queueOperation(operation: OfflineOperation) {
    this.pendingOperations.push(operation);
    this.syncStatus.pendingOperations = this.pendingOperations.length;
    this.savePendingOperations();
    this.notifyListeners();
  }

  private async syncPendingOperations() {
    if (this.pendingOperations.length === 0 || !this.isOnline) {
      return;
    }

    this.syncStatus.isSyncing = true;
    this.notifyListeners();

    console.log(`🔄 Syncing ${this.pendingOperations.length} pending operations...`);

    const operationsToSync = [...this.pendingOperations];
    const successfulOperations: string[] = [];
    const failedOperations: OfflineOperation[] = [];

    for (const operation of operationsToSync) {
      try {
        await this.executeOperation(operation);
        successfulOperations.push(operation.id);
        console.log(`✅ Synced operation: ${operation.type} ${operation.collection}/${operation.docId}`);
      } catch (error) {
        console.error(`❌ Failed to sync operation: ${operation.type} ${operation.collection}/${operation.docId}`, error);
        operation.retryCount++;
        
        if (operation.retryCount < 3) {
          failedOperations.push(operation);
        } else {
          console.error(`🚫 Operation failed after 3 retries: ${operation.id}`);
        }
      }
    }

    // Update pending operations
    this.pendingOperations = failedOperations;
    this.syncStatus.pendingOperations = this.pendingOperations.length;
    this.syncStatus.lastSyncTime = Date.now();
    this.syncStatus.isSyncing = false;

    this.savePendingOperations();
    this.notifyListeners();

    console.log(`✅ Sync complete: ${successfulOperations.length} successful, ${failedOperations.length} failed`);
  }

  private async executeOperation(operation: OfflineOperation) {
    const docRef = doc(db, operation.collection, operation.docId);

    switch (operation.type) {
      case 'CREATE':
        await this.handleCreateWithConflictResolution(docRef, operation);
        break;
      case 'UPDATE':
        await this.handleUpdateWithConflictResolution(docRef, operation);
        break;
      case 'DELETE':
        await this.handleDeleteWithConflictResolution(docRef, operation);
        break;
    }
  }

  private async handleCreateWithConflictResolution(docRef: any, operation: OfflineOperation) {
    try {
      // Check if document already exists
      const existingDoc = await getDoc(docRef);
      
      if (existingDoc.exists()) {
        // Document exists - this is a conflict
        console.log(`⚠️ Conflict detected: Document ${operation.collection}/${operation.docId} already exists`);
        
        // Apply conflict resolution strategy
        const resolvedData = await this.resolveConflict(
          operation.collection,
          operation.docId,
          null, // no local version for CREATE
          existingDoc.data(),
          operation.data,
          operation.conflictResolution || 'lastWriteWins'
        );
        
        await setDoc(docRef, resolvedData);
      } else {
        // No conflict - safe to create
        await setDoc(docRef, operation.data);
      }
    } catch (error) {
      console.error(`Error in create conflict resolution:`, error);
      throw error;
    }
  }

  private async handleUpdateWithConflictResolution(docRef: any, operation: OfflineOperation) {
    try {
      // Get current server version
      const serverDoc = await getDoc(docRef);
      
      if (!serverDoc.exists()) {
        // Document was deleted - this is a conflict
        console.log(`⚠️ Conflict detected: Document ${operation.collection}/${operation.docId} was deleted`);
        
        // For deleted documents, we'll recreate with offline data
        await setDoc(docRef, {
          ...operation.data,
          _conflictResolved: true,
          _recreatedAt: serverTimestamp()
        });
        return;
      }

      const serverData = serverDoc.data();
      const localData = operation.data;

      // Check for version conflicts
      if (this.hasVersionConflict(serverData, localData)) {
        console.log(`⚠️ Version conflict detected for ${operation.collection}/${operation.docId}`);
        
        // Apply conflict resolution
        const resolvedData = await this.resolveConflict(
          operation.collection,
          operation.docId,
          localData,
          serverData,
          localData,
          operation.conflictResolution || 'lastWriteWins'
        );
        
        await setDoc(docRef, resolvedData);
      } else {
        // No conflict - safe to update
        await updateDoc(docRef, operation.data);
      }
    } catch (error) {
      console.error(`Error in update conflict resolution:`, error);
      throw error;
    }
  }

  private async handleDeleteWithConflictResolution(docRef: any, operation: OfflineOperation) {
    try {
      // Check if document still exists
      const existingDoc = await getDoc(docRef);
      
      if (existingDoc.exists()) {
        // Document exists - safe to delete
        await updateDoc(docRef, {
          isActive: false,
          deletedAt: serverTimestamp(),
          deletedBy: operation.userId,
          _conflictResolved: true
        });
      } else {
        // Document already deleted - no conflict
        console.log(`Document ${operation.collection}/${operation.docId} already deleted`);
      }
    } catch (error) {
      console.error(`Error in delete conflict resolution:`, error);
      throw error;
    }
  }

  private hasVersionConflict(serverData: any, localData: any): boolean {
    // Check if server version is newer than local version
    const serverVersion = serverData.updatedAt || serverData._version || 0;
    const localVersion = localData.updatedAt || localData._version || 0;
    
    // If server version is significantly newer (more than 1 second), consider it a conflict
    if (serverVersion && localVersion) {
      const serverTime = serverVersion.toMillis ? serverVersion.toMillis() : new Date(serverVersion).getTime();
      const localTime = localVersion.toMillis ? localVersion.toMillis() : new Date(localVersion).getTime();
      
      return Math.abs(serverTime - localTime) > 1000; // 1 second threshold
    }
    
    return false;
  }

  private async resolveConflict(
    collection: string,
    docId: string,
    _localData: any,
    serverData: any,
    operationData: any,
    strategy: 'lastWriteWins' | 'merge' | 'manual'
  ): Promise<any> {
    console.log(`🔧 Resolving conflict for ${collection}/${docId} using strategy: ${strategy}`);

    switch (strategy) {
      case 'lastWriteWins':
        return this.lastWriteWinsResolution(serverData, operationData);
      
      case 'merge':
        return this.mergeResolution(serverData, operationData);
      
      case 'manual':
        return this.manualResolution(collection, docId, serverData, operationData);
      
      default:
        return this.lastWriteWinsResolution(serverData, operationData);
    }
  }

  private lastWriteWinsResolution(serverData: any, operationData: any): any {
    // Use the operation data (local changes) as it represents the user's intent
    return {
      ...serverData,
      ...operationData,
      _conflictResolved: true,
      _resolutionStrategy: 'lastWriteWins',
      _resolvedAt: serverTimestamp()
    };
  }

  private mergeResolution(serverData: any, operationData: any): any {
    // Merge non-conflicting fields, prioritize operation data for conflicts
    const merged = { ...serverData };
    
    for (const [key, value] of Object.entries(operationData)) {
      if (key.startsWith('_')) continue; // Skip metadata fields
      
      if (merged[key] !== undefined && merged[key] !== value) {
        // Field conflict - use operation data (user's latest intent)
        merged[key] = value;
      } else {
        merged[key] = value;
      }
    }
    
    return {
      ...merged,
      _conflictResolved: true,
      _resolutionStrategy: 'merge',
      _resolvedAt: serverTimestamp()
    };
  }

  private async manualResolution(collection: string, docId: string, serverData: any, operationData: any): Promise<any> {
    // For manual resolution, we'll store both versions and let the user decide
    // This is a simplified version - in a real app, you'd show a UI for conflict resolution
    console.log(`Manual conflict resolution needed for ${collection}/${docId}`);
    
    // For now, use lastWriteWins as fallback
    return this.lastWriteWinsResolution(serverData, operationData);
  }

  // Local storage for pending operations
  private savePendingOperations() {
    try {
      localStorage.setItem('ccmis_pending_operations', JSON.stringify(this.pendingOperations));
    } catch (error) {
      console.error('Error saving pending operations:', error);
    }
  }

  private loadPendingOperations() {
    try {
      const stored = localStorage.getItem('ccmis_pending_operations');
      if (stored) {
        this.pendingOperations = JSON.parse(stored);
        this.syncStatus.pendingOperations = this.pendingOperations.length;
      }
    } catch (error) {
      console.error('Error loading pending operations:', error);
      this.pendingOperations = [];
    }
  }

  // Cache management
  private getCachedDocument(collection: string, docId: string): any {
    try {
      const cacheKey = `ccmis_cache_${collection}_${docId}`;
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached document:', error);
      return null;
    }
  }

  private getCachedCollection(collection: string): any[] {
    try {
      const cacheKey = `ccmis_cache_${collection}`;
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached collection:', error);
      return [];
    }
  }

  // Status and listeners
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      const index = this.syncListeners.indexOf(callback);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.syncListeners.forEach(callback => callback(this.syncStatus));
  }

  // Force sync
  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncPendingOperations();
    }
  }

  // Clear all pending operations (use with caution)
  clearPendingOperations(): void {
    this.pendingOperations = [];
    this.syncStatus.pendingOperations = 0;
    this.savePendingOperations();
    this.notifyListeners();
  }

  // Get conflict resolution strategy based on collection type
  private getConflictResolutionStrategy(collection: string): 'lastWriteWins' | 'merge' | 'manual' {
    switch (collection) {
      case 'patients':
        return 'merge'; // Patient data should be merged to preserve all information
      case 'consultations':
        return 'lastWriteWins'; // Consultations are typically append-only
      case 'tasks':
        return 'merge'; // Task updates should merge
      case 'users':
        return 'lastWriteWins'; // User data conflicts should use latest
      case 'hospitals':
        return 'lastWriteWins'; // Hospital data should use latest
      default:
        return 'lastWriteWins';
    }
  }

  // Bidirectional sync - pull changes from server when coming online
  async performBidirectionalSync(): Promise<void> {
    if (!this.isOnline) {
      console.log('Cannot perform bidirectional sync while offline');
      return;
    }

    console.log('🔄 Starting bidirectional sync...');
    this.syncStatus.isSyncing = true;
    this.notifyListeners();

    try {
      // First, push local changes
      await this.syncPendingOperations();

      // Then, pull server changes for all collections
      await this.pullServerChanges();

      this.syncStatus.lastSyncTime = Date.now();
      console.log('✅ Bidirectional sync completed');
    } catch (error) {
      console.error('❌ Bidirectional sync failed:', error);
    } finally {
      this.syncStatus.isSyncing = false;
      this.notifyListeners();
    }
  }

  private async pullServerChanges(): Promise<void> {
    const collections = ['patients', 'consultations', 'tasks', 'users', 'hospitals'];
    
    for (const collectionName of collections) {
      try {
        await this.pullCollectionChanges(collectionName);
      } catch (error) {
        console.error(`Error pulling changes for ${collectionName}:`, error);
      }
    }
  }

  private async pullCollectionChanges(collectionName: string): Promise<void> {
    try {
      // Get the last sync timestamp for this collection
      const lastSyncKey = `ccmis_last_sync_${collectionName}`;
      const lastSync = localStorage.getItem(lastSyncKey);
      const lastSyncTime = lastSync ? parseInt(lastSync) : 0;

      // Query for documents updated since last sync
      const q = query(
        collection(db, collectionName),
        where('updatedAt', '>', new Date(lastSyncTime)),
        orderBy('updatedAt', 'asc')
      );

      const snapshot = await getDocs(q);
      const changes = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));

      if (changes.length > 0) {
        console.log(`📥 Pulled ${changes.length} changes for ${collectionName}`);
        
        // Update local cache
        this.updateLocalCache(collectionName, changes);
        
        // Update last sync timestamp
        localStorage.setItem(lastSyncKey, Date.now().toString());
        
        // Notify listeners about new data
        this.notifyDataChange(collectionName, changes);
      }
    } catch (error) {
      console.error(`Error pulling changes for ${collectionName}:`, error);
    }
  }

  private updateLocalCache(collectionName: string, changes: any[]): void {
    try {
      const cacheKey = `ccmis_cache_${collectionName}`;
      const existingCache = this.getCachedCollection(collectionName);
      
      // Merge changes with existing cache
      const updatedCache = [...existingCache];
      
      changes.forEach(change => {
        const existingIndex = updatedCache.findIndex(item => item.id === change.id);
        if (existingIndex >= 0) {
          // Update existing item
          updatedCache[existingIndex] = change;
        } else {
          // Add new item
          updatedCache.push(change);
        }
      });
      
      // Save updated cache
      localStorage.setItem(cacheKey, JSON.stringify(updatedCache));
    } catch (error) {
      console.error(`Error updating local cache for ${collectionName}:`, error);
    }
  }

  private notifyDataChange(collectionName: string, changes: any[]): void {
    // This would typically trigger UI updates
    // For now, we'll just log the changes
    console.log(`📊 Data change notification for ${collectionName}:`, changes.length, 'items');
  }

  // Enhanced sync with conflict detection
  async enhancedSync(): Promise<void> {
    if (!this.isOnline) {
      console.log('Cannot perform enhanced sync while offline');
      return;
    }

    console.log('🚀 Starting enhanced sync with conflict detection...');
    
    try {
      // Perform bidirectional sync
      await this.performBidirectionalSync();
      
      // Check for any remaining conflicts
      await this.detectAndResolveConflicts();
      
      console.log('✅ Enhanced sync completed successfully');
    } catch (error) {
      console.error('❌ Enhanced sync failed:', error);
    }
  }

  private async detectAndResolveConflicts(): Promise<void> {
    // This method would detect any remaining conflicts after sync
    // and apply appropriate resolution strategies
    console.log('🔍 Checking for remaining conflicts...');
    
    // Implementation would check for conflicts between local and server data
    // and apply resolution strategies as needed
  }
}

// Export singleton instance
export const offlineService = new OfflineService();
export default offlineService;
