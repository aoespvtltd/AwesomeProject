import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  NativeModules,
  AppState,
} from 'react-native';
import RNFS from 'react-native-fs';

const { ApkInstaller } = NativeModules;

export default function DownloadApkPage({setRoute}) {
  const [downloading, setDownloading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (Platform.OS !== 'android') {
      setHasPermission(true);
      return;
    }

    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      setHasPermission(granted);
    } catch (err) {
      console.warn('Permission check failed:', err);
      setHasPermission(false);
    }
  };

  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'App needs access to your storage to download the APK',
          buttonPositive: 'OK',
        }
      );
      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      setHasPermission(isGranted);
      return isGranted;
    } catch (err) {
      console.warn('Permission request failed:', err);
      return false;
    }
  };

  const downloadAndInstall = async () => {
    if (!hasPermission) {
      const permissionGranted = await requestStoragePermission();
      if (!permissionGranted) {
        Alert.alert('Error', 'Storage permission is required to download and install the update');
        return;
      }
    }

    try {
      setDownloading(true);
      setDownloadProgress(0);

      // Replace this URL with your actual APK download URL
      const downloadUrl = 'https://vendingao-api.xyz/api/v1/appVersion/downloadApp';
      const downloadDest = `${RNFS.DownloadDirectoryPath}/app-release.apk`;

      // Start the download
      const download = RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: downloadDest,
        background: true,
        begin: (res) => {
          console.log('Download started:', res);
        },
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          setDownloadProgress(progress);
          console.log(`Download progress: ${progress}%`);
        },
      });

      // Wait for download to complete
      const result = await download.promise;
      
      if (result.statusCode === 200) {
        console.log('Download completed successfully');
        
        // Verify file exists before installation
        const fileExists = await RNFS.exists(downloadDest);
        if (!fileExists) {
          throw new Error('APK file not found at: ' + downloadDest);
        }

        console.log('File exists, attempting installation with path:', downloadDest);

        // Install the APK using our native module
        const installResult = await ApkInstaller.installApk(downloadDest);
        console.log('Installation result:', installResult);
        
        if (installResult === 'INSTALLATION_STARTED') {
          Alert.alert('Success', 'Installation process started - please complete the installation in the system dialog');
        } else {
          Alert.alert('Success', 'APK installed successfully');
        }
      } else {
        throw new Error(`Download failed with status code: ${result.statusCode}`);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to download or install the update. Please try again.');
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
      <TouchableOpacity
        style={[styles.button, (!hasPermission || downloading) && styles.buttonDisabled]}
        onPress={downloadAndInstall}
        disabled={downloading || !hasPermission}
      >
        <Text style={styles.buttonText}>
          {downloading 
            ? `Downloading... ${Math.round(downloadProgress)}%` 
            : !hasPermission 
              ? 'Permission Required' 
              : 'Update Now'}
        </Text>
      </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    // paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
