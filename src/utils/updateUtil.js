import RNFS from 'react-native-fs';
import { checkForUpdate } from '../../components/api/api';
import DeviceInfo from 'react-native-device-info';

const { ApkInstaller } = require('react-native').NativeModules;

class UpdateUtil {
  constructor() {
    this.appName = 'lphavend';
    // Use internal app storage (no permission needed)
    this.apkFolder = `${RNFS.DownloadDirectoryPath}/apk`;
  }

  getApkFileName(version) {
    return `lphavendv${version}.apk`;
  }

  getApkPath(version) {
    return `${this.apkFolder}/${this.getApkFileName(version)}`;
  }

  // Check if update is available
  async checkForUpdate() {
    try {
      const res = await checkForUpdate(this.appName, DeviceInfo.getVersion());
      console.log('Update check response:', res.data.success, res.data.data);
      
      if (res?.data?.success && res?.data?.data?.appUrl) {
        return {
          available: true,
          appUrl: res.data.data.appUrl,
          version: res.data.data.version || DeviceInfo.getVersion()
        };
      }
      return { available: false };
    } catch (error) {
      console.log('Error checking for update:', error);
      return { available: false };
    }
  }

  // Check if APK already exists
  async isApkDownloaded() {
    try {
      const exists = await RNFS.exists(this.getApkPath(DeviceInfo.getVersion()));
      console.log(this.getApkPath(DeviceInfo.getVersion()), this.getApkFileName(DeviceInfo.getVersion()), this.apkFolder)
      return exists;
    } catch (error) {
      console.log('Error checking APK existence:', error);
      return false;
    }
  }

  // Download APK (no permission needed for app directory)
  async downloadApk(appUrl, onProgress) {
    try {
      // Create apk folder if it doesn't exist
      const folderExists = await RNFS.exists(this.apkFolder);
      if (!folderExists) {
        await RNFS.mkdir(this.apkFolder);
      }

      // Check if APK already exists
      const apkExists = await this.isApkDownloaded();
      if (apkExists) {
        console.log('APK already exists, skipping download');
        return { success: true, alreadyExists: true };
      }

      // Download the APK
      const download = RNFS.downloadFile({
        fromUrl: appUrl,
        toFile: this.getApkPath(DeviceInfo.getVersion()),
        background: true,
        progress: (res) => {
          if (onProgress) {
            const progress = (res.bytesWritten / res.contentLength) * 100;
            onProgress(progress);
          }
        },
      });

      const result = await download.promise;
      
      if (result.statusCode === 200) {
        // Verify file exists
        const fileExists = await RNFS.exists(this.getApkPath(DeviceInfo.getVersion()));
        if (!fileExists) {
          throw new Error('APK file not found after download');
        }
        
        console.log('APK downloaded successfully to:', this.getApkPath(DeviceInfo.getVersion()));
        return { success: true, alreadyExists: false };
      } else {
        throw new Error(`Download failed with status: ${result.statusCode}`);
      }
    } catch (error) {
      console.log('Error downloading APK:', error);
      throw error;
    }
  }

  // Install APK
  async installApk() {
    try {
      const apkExists = await this.isApkDownloaded();
      console.log(apkExists)
      if (!apkExists) {
        throw new Error('APK not found. Please download first.');
      }

      const installResult = await ApkInstaller.installApk(this.getApkPath(DeviceInfo.getVersion()));
      console.log('Installation result:', installResult);
      
      if (installResult === 'INSTALLATION_STARTED') {
        // Delete APK after successful installation start
        setTimeout(async () => {
          try {
            await RNFS.unlink(this.getApkPath(DeviceInfo.getVersion()));
            console.log('APK deleted after installation');
          } catch (error) {
            console.log('Error deleting APK:', error);
          }
        }, 2000); // Wait 2 seconds before deleting
        
        return { success: true, message: 'Installation started. Complete it in the system dialog.' };
      } else {
        return { success: true, message: 'APK installed successfully' };
      }
    } catch (error) {
      console.log('Error installing APK:', error);
      throw error;
    }
  }

  // Get APK file info
  async getApkInfo() {
    try {
      const exists = await this.isApkDownloaded();
      if (!exists) {
        return { exists: false };
      }

      const stats = await RNFS.stat(this.getApkPath(DeviceInfo.getVersion()));
      return {
        exists: true,
        path: this.getApkPath(DeviceInfo.getVersion()),
        size: stats.size,
        name: this.getApkFileName(DeviceInfo.getVersion())
      };
    } catch (error) {
      console.log('Error getting APK info:', error);
      return { exists: false };
    }
  }

  // Clean up APK file
  async cleanupApk() {
    try {
      const exists = await this.isApkDownloaded();
      if (exists) {
        await RNFS.unlink(this.getApkPath(DeviceInfo.getVersion()));
        console.log('APK cleaned up');
        return true;
      }
      return false;
    } catch (error) {
      console.log('Error cleaning up APK:', error);
      return false;
    }
  }
}

export default new UpdateUtil(); 