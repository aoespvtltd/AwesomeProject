import React, { useState, useEffect } from 'react';
import {
  Text,
  TouchableOpacity,
  Alert,
  View,
} from 'react-native';
import updateUtil from './updateUtil';

export default function InstallApkButton() {
  const [apkExists, setApkExists] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [apkInfo, setApkInfo] = useState(null);

  useEffect(() => {
    checkApkExists();
  }, []);

  const checkApkExists = async () => {
    try {
      const info = await updateUtil.getApkInfo();
      setApkExists(info.exists);
      setApkInfo(info);
    } catch (error) {
      console.log('Error checking APK:', error);
      setApkExists(false);
    }
  };

  const handleInstall = async () => {
    try {
      setInstalling(true);
      console.log("object")
      const result = await updateUtil.installApk();
      console.log("objec2t")
      
      if (result.success) {
        Alert.alert('Success', result.message);
        // Refresh to check if APK still exists
        setTimeout(() => {
          checkApkExists();
        }, 1000);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to install APK');
      console.log('Install error:', error);
    } finally {
      setInstalling(false);
    }
  };

  if (!apkExists) return <View paddingHorizontal={16} /> ;

  return (
    <TouchableOpacity
      style={{
        backgroundColor: installing ? '#cccccc' : '#34C759',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        opacity: installing ? 0.7 : 1,
        marginVertical: 8,
      }}
      onPress={handleInstall}
      disabled={installing}
    >
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
        {installing ? 'Installing...' : 'Install'}
      </Text>
    </TouchableOpacity>
  );
} 