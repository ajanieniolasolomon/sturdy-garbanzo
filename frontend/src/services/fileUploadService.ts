// Complete File Upload Service for CCMIS Production
import { 
  ref, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable,
  getMetadata
} from 'firebase/storage';
import { storage } from '../config/firebase';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  url?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  metadata?: FileMetadata;
}

class FileUploadService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png'
  ];

  // Validate file before upload
  private validateFile(file: File, allowedTypes: string[]): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }

    return { valid: true };
  }

  // Upload patient photo
  async uploadPatientPhoto(
    patientId: string, 
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      const validation = this.validateFile(file, this.ALLOWED_IMAGE_TYPES);
      if (!validation.valid) {
        return { success: false, error: validation.error, path: '' };
      }

      const timestamp = Date.now();
      const fileName = `photo_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `patients/${patientId}/photos/${fileName}`);

      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              percentage: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            };
            onProgress?.(progress);
          },
          (error) => {
            resolve({ success: false, error: error.message, path: '' });
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const metadata: FileMetadata = {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                url: downloadURL
              };
              resolve({ success: true, url: downloadURL, path: `patients/${patientId}/photos/${fileName}`, metadata });
            } catch (error) {
              resolve({ success: false, error: 'Failed to get download URL', path: '' });
            }
          }
        );
      });
    } catch (error) {
      return { success: false, error: 'Upload failed', path: '' };
    }
  }

  // Upload patient document
  async uploadPatientDocument(
    patientId: string, 
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      const validation = this.validateFile(file, this.ALLOWED_DOCUMENT_TYPES);
      if (!validation.valid) {
        return { success: false, error: validation.error, path: '' };
      }

      const timestamp = Date.now();
      const fileName = `doc_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `patients/${patientId}/documents/${fileName}`);

      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              percentage: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            };
            onProgress?.(progress);
          },
          (error) => {
            resolve({ success: false, error: error.message, path: '' });
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const metadata: FileMetadata = {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                url: downloadURL
              };
              resolve({ success: true, url: downloadURL, path: `patients/${patientId}/documents/${fileName}`, metadata });
            } catch (error) {
              resolve({ success: false, error: 'Failed to get download URL', path: '' });
            }
          }
        );
      });
    } catch (error) {
      return { success: false, error: 'Upload failed', path: '' };
    }
  }

  // Upload hospital document
  async uploadHospitalDocument(
    hospitalId: string, 
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      const validation = this.validateFile(file, this.ALLOWED_DOCUMENT_TYPES);
      if (!validation.valid) {
        return { success: false, error: validation.error, path: '' };
      }

      const timestamp = Date.now();
      const fileName = `doc_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `hospitals/${hospitalId}/documents/${fileName}`);

      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              percentage: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            };
            onProgress?.(progress);
          },
          (error) => {
            resolve({ success: false, error: error.message, path: '' });
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const metadata: FileMetadata = {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                url: downloadURL
              };
              resolve({ success: true, url: downloadURL, path: `hospitals/${hospitalId}/documents/${fileName}`, metadata });
            } catch (error) {
              resolve({ success: false, error: 'Failed to get download URL', path: '' });
            }
          }
        );
      });
    } catch (error) {
      return { success: false, error: 'Upload failed', path: '' };
    }
  }

  // Upload user avatar
  async uploadUserAvatar(
    userId: string, 
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      const validation = this.validateFile(file, this.ALLOWED_IMAGE_TYPES);
      if (!validation.valid) {
        return { success: false, error: validation.error, path: '' };
      }

      const timestamp = Date.now();
      const fileName = `avatar_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `users/${userId}/avatar/${fileName}`);

      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              percentage: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            };
            onProgress?.(progress);
          },
          (error) => {
            resolve({ success: false, error: error.message, path: '' });
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const metadata: FileMetadata = {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                url: downloadURL
              };
              resolve({ success: true, url: downloadURL, path: `users/${userId}/avatar/${fileName}`, metadata });
            } catch (error) {
              resolve({ success: false, error: 'Failed to get download URL', path: '' });
            }
          }
        );
      });
    } catch (error) {
      return { success: false, error: 'Upload failed', path: '' };
    }
  }

  // Simple upload function for backward compatibility
  async uploadUserFile(params: {
    file: File | Blob;
    hospitalId: string;
    userId: string;
    filename: string;
  }): Promise<{ url: string; path: string }> {
    const { file, hospitalId, userId, filename } = params;
    const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const path = `uploads/${hospitalId}/${userId}/${Date.now()}_${safeName}`;
    const fileRef = ref(storage, path);
    await uploadBytesResumable(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return { url, path };
  }

  // Delete file
  async deleteFile(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete file' };
    }
  }

  // Get file metadata
  async getFileMetadata(url: string): Promise<FileMetadata | null> {
    try {
      const fileRef = ref(storage, url);
      const metadata = await getMetadata(fileRef);
      
      return {
        name: metadata.name,
        size: metadata.size,
        type: metadata.contentType || '',
        lastModified: metadata.timeCreated ? new Date(metadata.timeCreated).getTime() : 0,
        url
      };
    } catch (error) {
      return null;
    }
  }

  // Compress image before upload
  async compressImage(file: File, maxWidth: number = 800, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Generate thumbnail for images
  async generateThumbnail(file: File, size: number = 150): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = size;
        canvas.height = size;

        // Draw image centered and scaled
        const scale = Math.min(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;

        ctx?.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnailUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Batch upload multiple files
  async uploadMultipleFiles(
    files: File[],
    uploadFunction: (file: File, onProgress?: (progress: UploadProgress) => void) => Promise<UploadResult>,
    onProgress?: (overallProgress: { completed: number; total: number; percentage: number }) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    let completed = 0;

    for (const file of files) {
      try {
        const result = await uploadFunction(file, (_progress) => {
          // Calculate overall progress
          const overallProgress = {
            completed,
            total: files.length,
            percentage: Math.round((completed / files.length) * 100)
          };
          onProgress?.(overallProgress);
        });
        
        results.push(result);
        completed++;
        
        const overallProgress = {
          completed,
          total: files.length,
          percentage: Math.round((completed / files.length) * 100)
        };
        onProgress?.(overallProgress);
      } catch (error) {
        results.push({ success: false, error: 'Upload failed', path: '' });
        completed++;
      }
    }

    return results;
  }

  // Get storage usage for a user
  async getStorageUsage(_userId: string): Promise<{ used: number; limit: number; percentage: number }> {
    // This would typically be calculated server-side
    // For now, return mock data
    return {
      used: 0, // in bytes
      limit: 100 * 1024 * 1024, // 100MB limit
      percentage: 0
    };
  }

  // Clean up old files
  async cleanupOldFiles(_daysOld: number = 30): Promise<{ deleted: number; errors: string[] }> {
    // This would typically be done server-side with a scheduled function
    // For now, return mock data
    return {
      deleted: 0,
      errors: []
    };
  }
}

// Create singleton instance
const fileUploadService = new FileUploadService();

export default fileUploadService;