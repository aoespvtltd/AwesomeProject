import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import RNFS from 'react-native-fs';
import Video from 'react-native-video';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMachineDetails } from '../api/api';

const DEFAULT_VIDEO_URL = 'https://files.vendingao.com/files/1751968280833.mp4';
const VIDEO_PATH = `${RNFS.DownloadDirectoryPath}/ad.mp4`;
const ASYNC_KEY = 'adBannerUrl';

const AdBanner = ({ refreshKey, machineId }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [currentAdUrl, setCurrentAdUrl] = useState(null);
  const screenWidth = Dimensions.get('window').width;
  const bannerHeight = screenWidth * 9 / 16;

  useEffect(() => {
    let isMounted = true;
    const fetchAdUrlAndHandleVideo = async () => {
      setError(null);
      let adUrl = null;
      let keypadPassword = null;
      try {
        if (!machineId) throw new Error('No machineId');
        const res = await getMachineDetails(machineId);
        adUrl = res?.data?.data?.adUrl || '';
        keypadPassword = res?.data?.data?.keypadPassword;
        if (keypadPassword) {
          await AsyncStorage.setItem('keypadPassword', keypadPassword);
        }
      } catch (e) {
        adUrl = '';
      }
      if (!isMounted) return;
      setCurrentAdUrl(adUrl);
      if (!adUrl || adUrl === '') {
        setVideoUri(null);
        setDownloaded(false);
        setDownloading(false);
        return;
      }
      try {
        const storedAdUrl = await AsyncStorage.getItem(ASYNC_KEY);
        if (storedAdUrl === adUrl) {
          // Video already downloaded for this adUrl
          const exists = await RNFS.exists(VIDEO_PATH);
          if (exists) {
            setVideoUri('file://' + VIDEO_PATH);
            setDownloaded(true);
            return;
          }
        } else {
          // New adUrl, delete old video if exists
          const exists = await RNFS.exists(VIDEO_PATH);
          if (exists) {
            try { await RNFS.unlink(VIDEO_PATH); } catch {}
          }
          await AsyncStorage.setItem(ASYNC_KEY, adUrl);
        }
        // Download new video
        setDownloading(true);
        setDownloaded(false);
        setVideoUri(null);
        await RNFS.downloadFile({
          fromUrl: adUrl,
          toFile: VIDEO_PATH,
        }).promise;
        if (!isMounted) return;
        setVideoUri('file://' + VIDEO_PATH);
        setDownloaded(true);
      } catch (e) {
        setError('Failed to load ad video.');
        setVideoUri(adUrl); // fallback to streaming
      } finally {
        setDownloading(false);
      }
    };
    fetchAdUrlAndHandleVideo();
    return () => { isMounted = false; };
  }, [refreshKey, machineId]);

  // If adUrl is not present or empty, collapse the section
  if (!currentAdUrl || currentAdUrl === '') {
    return null;
  }

  if (downloading) {
    return (
      <View style={[styles.banner, { height: bannerHeight, justifyContent: 'center', alignItems: 'center' }] }>
        <ActivityIndicator size="small" />
        <Text style={{marginLeft: 8}}>Loading Ad...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.banner, { height: bannerHeight, justifyContent: 'center', alignItems: 'center' }] }>
        <Text>{error}</Text>
      </View>
    );
  }

  if (!videoUri) {
    return (
      <View style={[styles.banner, { height: bannerHeight, justifyContent: 'center', alignItems: 'center' }] }>
        <Text>Preparing ad...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.banner, { height: bannerHeight }] }>
      <Video
        source={{ uri: videoUri }}
        style={{ width: '100%', height: '100%' }}
        controls={false}
        resizeMode="cover"
        repeat
        muted
      />
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    backgroundColor: 'black',
    position: 'relative',
    overflow: 'hidden',
  },
});

export default AdBanner; 