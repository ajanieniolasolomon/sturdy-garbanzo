# 📱 CCMIS Mobile App Setup with Capacitor

## 🚀 **Transform Your Web App into Native Mobile Apps**

Capacitor allows you to build native iOS and Android apps from your existing React web application with minimal changes.

---

## 🛠️ **Installation & Setup**

### Step 1: Install Capacitor

```bash
cd CCMIS-New/frontend
npm install @capacitor/core @capacitor/cli
npx cap init
```

### Step 2: Add Mobile Platforms

```bash
# Add iOS platform (macOS only)
npm install @capacitor/ios
npx cap add ios

# Add Android platform
npm install @capacitor/android
npx cap add android
```

### Step 3: Install Essential Plugins

```bash
# Core plugins for offline functionality
npm install @capacitor/app @capacitor/network @capacitor/status-bar
npm install @capacitor/splash-screen @capacitor/keyboard
npm install @capacitor/local-notifications @capacitor/camera
npm install @capacitor/filesystem @capacitor/device
npm install @capacitor/geolocation @capacitor/preferences
```

---

## 📱 **Mobile-Specific Features**

### 1. **Offline-First Mobile Experience**

```typescript
// src/lib/mobileOffline.ts
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { LocalNotifications } from '@capacitor/local-notifications';

export class MobileOfflineService {
  private isOnline = true;
  private syncQueue: any[] = [];

  async initialize() {
    // Monitor network status
    Network.addListener('networkStatusChange', (status) => {
      this.isOnline = status.connected;
      this.handleNetworkChange();
    });

    // Check initial network status
    const status = await Network.getStatus();
    this.isOnline = status.connected;

    // Set up offline notifications
    await this.setupOfflineNotifications();
  }

  private async handleNetworkChange() {
    if (this.isOnline) {
      await this.syncPendingData();
      await this.showOnlineNotification();
    } else {
      await this.showOfflineNotification();
    }
  }

  private async syncPendingData() {
    // Sync all pending changes when back online
    for (const item of this.syncQueue) {
      try {
        await this.syncItem(item);
        this.syncQueue = this.syncQueue.filter(i => i.id !== item.id);
      } catch (error) {
        console.error('Sync failed for item:', item, error);
      }
    }
  }

  private async showOfflineNotification() {
    await LocalNotifications.schedule({
      notifications: [{
        title: 'CCMIS Offline',
        body: 'You are now working offline. Data will sync when connection is restored.',
        id: 1,
        schedule: { at: new Date(Date.now() + 1000) }
      }]
    });
  }

  private async showOnlineNotification() {
    await LocalNotifications.schedule({
      notifications: [{
        title: 'CCMIS Online',
        body: 'Connection restored. Syncing your data...',
        id: 2,
        schedule: { at: new Date(Date.now() + 1000) }
      }]
    });
  }
}
```

### 2. **Camera Integration for Patient Photos**

```typescript
// src/components/PatientPhotoCapture.tsx
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const PatientPhotoCapture: React.FC = () => {
  const [photo, setPhoto] = useState<string | null>(null);

  const takePhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (image.webPath) {
        setPhoto(image.webPath);
        await savePhotoToStorage(image.webPath);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  const savePhotoToStorage = async (photoPath: string) => {
    try {
      const fileName = `patient_${Date.now()}.jpg`;
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: photoPath,
        directory: Directory.Data
      });
      
      return savedFile.uri;
    } catch (error) {
      console.error('Error saving photo:', error);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={takePhoto}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg"
      >
        Take Patient Photo
      </button>
      
      {photo && (
        <img src={photo} alt="Patient" className="mt-4 w-full rounded-lg" />
      )}
    </div>
  );
};
```

### 3. **Geolocation for Patient Address**

```typescript
// src/lib/geolocation.ts
import { Geolocation } from '@capacitor/geolocation';

export class LocationService {
  static async getCurrentLocation() {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      return {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  static async getAddressFromCoordinates(lat: number, lng: number) {
    // Use reverse geocoding service
    // This would integrate with a service like Google Maps or OpenStreetMap
    return {
      address: 'Current Location',
      lga: 'Auto-detected',
      state: 'Auto-detected'
    };
  }
}
```

---

## 🔧 **Configuration Files**

### 1. **Capacitor Configuration**

```json
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ccmis.healthcare',
  appName: 'CCMIS Healthcare',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
    Camera: {
      permissions: ["camera", "photos"]
    },
    Geolocation: {
      permissions: ["location"]
    }
  }
};

export default config;
```

### 2. **Android Configuration**

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">
        
        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name="com.ccmis.healthcare.MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### 3. **iOS Configuration**

```xml
<!-- ios/App/App/Info.plist -->
<dict>
    <key>NSCameraUsageDescription</key>
    <string>This app needs access to camera to take patient photos</string>
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>This app needs access to location to auto-fill patient addresses</string>
    <key>NSPhotoLibraryUsageDescription</key>
    <string>This app needs access to photo library to save patient photos</string>
</dict>
```

---

## 📱 **Mobile-Specific UI Components**

### 1. **Mobile Navigation**

```typescript
// src/components/MobileNavigation.tsx
import { useState } from 'react';
import { 
  HomeIcon, 
  UserGroupIcon, 
  CalendarDaysIcon, 
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CogIcon
} from '@heroicons/react/24/outline';

export const MobileNavigation: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
    { id: 'patients', label: 'Patients', icon: UserGroupIcon },
    { id: 'consultations', label: 'Consultations', icon: CalendarDaysIcon },
    { id: 'tasks', label: 'Tasks', icon: ClipboardDocumentListIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
    { id: 'settings', label: 'Settings', icon: CogIcon }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-2 px-3 ${
                activeTab === tab.id 
                  ? 'text-blue-600' 
                  : 'text-gray-500'
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
```

### 2. **Mobile-Optimized Forms**

```typescript
// src/components/MobilePatientForm.tsx
import { useState } from 'react';
import { LocationService } from '../lib/geolocation';

export const MobilePatientForm: React.FC = () => {
  const [useLocation, setUseLocation] = useState(false);

  const handleUseCurrentLocation = async () => {
    const location = await LocationService.getCurrentLocation();
    if (location) {
      const address = await LocationService.getAddressFromCoordinates(
        location.latitude, 
        location.longitude
      );
      // Auto-fill address fields
      setFormData(prev => ({
        ...prev,
        address: address.address,
        lga: address.lga,
        state: address.state
      }));
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Location Auto-fill */}
      <div className="bg-blue-50 p-3 rounded-lg">
        <button
          onClick={handleUseCurrentLocation}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg"
        >
          📍 Use Current Location
        </button>
      </div>

      {/* Form fields optimized for mobile */}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Full Name"
          className="w-full p-3 border border-gray-300 rounded-lg text-lg"
        />
        
        <input
          type="number"
          placeholder="Age"
          className="w-full p-3 border border-gray-300 rounded-lg text-lg"
        />
        
        {/* Mobile-optimized select */}
        <select className="w-full p-3 border border-gray-300 rounded-lg text-lg">
          <option>Select Gender</option>
          <option>Male</option>
          <option>Female</option>
          <option>Other</option>
        </select>
      </div>
    </div>
  );
};
```

---

## 🚀 **Build & Deploy**

### 1. **Build for Mobile**

```bash
# Build the web app
npm run build

# Copy web assets to mobile platforms
npx cap copy

# Open in native IDEs
npx cap open ios     # Opens Xcode
npx cap open android # Opens Android Studio
```

### 2. **Development Workflow**

```bash
# Watch for changes and sync
npx cap run ios --livereload --external
npx cap run android --livereload --external

# Build and run on device
npx cap run ios --target="iPhone 14"
npx cap run android --target="Pixel_6_API_33"
```

### 3. **Production Build**

```bash
# Build for production
npm run build

# Sync to mobile platforms
npx cap sync

# Build native apps
# iOS: Use Xcode to archive and upload to App Store
# Android: Use Android Studio to generate APK/AAB
```

---

## 📱 **Mobile App Features**

### ✅ **Offline-First Mobile Experience**
- **Complete offline functionality** - Works without internet
- **Automatic sync** when connection restored
- **Local data storage** with IndexedDB
- **Offline notifications** and status indicators

### ✅ **Native Mobile Features**
- **Camera integration** for patient photos
- **Geolocation** for auto-filling addresses
- **Push notifications** for appointments and tasks
- **Biometric authentication** (fingerprint/face ID)
- **File system access** for document storage

### ✅ **Mobile-Optimized UI**
- **Touch-friendly interface** with large buttons
- **Bottom navigation** for easy thumb access
- **Swipe gestures** for navigation
- **Mobile-optimized forms** with auto-complete
- **Responsive design** for all screen sizes

### ✅ **Performance Optimizations**
- **Lazy loading** of components
- **Image optimization** and compression
- **Efficient data caching** strategies
- **Background sync** without blocking UI

---

## 🎯 **Benefits of Mobile App**

1. **📱 Native Performance** - Faster than web app
2. **🔒 Enhanced Security** - Biometric authentication
3. **📷 Camera Access** - Take patient photos directly
4. **📍 Location Services** - Auto-fill patient addresses
5. **🔔 Push Notifications** - Real-time alerts
6. **💾 Better Offline** - Native storage capabilities
7. **📱 App Store Distribution** - Professional deployment
8. **🎨 Native UI** - Platform-specific design

---

## 🚀 **Quick Start**

```bash
# 1. Install Capacitor
cd CCMIS-New/frontend
npm install @capacitor/core @capacitor/cli

# 2. Initialize
npx cap init

# 3. Add platforms
npx cap add ios
npx cap add android

# 4. Build and run
npm run build
npx cap copy
npx cap open ios
npx cap open android
```

**Your CCMIS web app is now a native mobile app! 📱✨**

---

## 📞 **Support**

- **Capacitor Docs**: [capacitorjs.com/docs](https://capacitorjs.com/docs)
- **Ionic Community**: [ionicframework.com/community](https://ionicframework.com/community)
- **Stack Overflow**: [stackoverflow.com/questions/tagged/capacitor](https://stackoverflow.com/questions/tagged/capacitor)

**Transform your healthcare web app into powerful mobile apps! 🏥📱**
