import React, { useState, useEffect } from 'react';
import {
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import updateUtil from '../../src/utils/updateUtil';

export default function DownloadApkButton() {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    checkForUpdate();
  }, []);

  const checkForUpdate = async () => {
    try {
      const result = await updateUtil.checkForUpdate();
      if (result.available) {
        setUpdateAvailable(true);
        setUpdateInfo(result);
      } else {
        setUpdateAvailable(false);
      }
    } catch (error) {
      console.log('Error checking for update:', error);
      setUpdateAvailable(false);
    }
  };

  const handleDownload = async () => {
    if (!updateInfo?.appUrl) {
      Alert.alert('Error', 'No download URL available');
      return;
    }

    try {
      setDownloading(true);
      setDownloadProgress(0);

      const result = await updateUtil.downloadApk(
        updateInfo.appUrl,
        (progress) => setDownloadProgress(progress)
      );

      if (result.success) {
        if (result.alreadyExists) {
          Alert.alert('Info', 'APK already downloaded');
        } else {
          Alert.alert('Success', 'APK downloaded successfully');
        }
        // Refresh to check if APK exists now
        checkForUpdate();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download APK');
      console.log('Download error:', error);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (!updateAvailable) return <Text style={{padding: 16}}></Text>;

  return (
    <TouchableOpacity
      style={{
        backgroundColor: downloading ? '#cccccc' : '#ff6600',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        opacity: downloading ? 0.7 : 1,
        marginVertical: 8,
      }}
      onPress={handleDownload}
      disabled={downloading}
    >
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
        {downloading
          ? `Downloading... ${Math.round(downloadProgress)}%`
          : 'Download Update'}
      </Text>
    </TouchableOpacity>
  );
}
