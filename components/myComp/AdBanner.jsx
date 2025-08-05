import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import RNFS from 'react-native-fs';
import Video from 'react-native-video';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMachineDetails } from '../api/api';

const DEFAULT_VIDEO_URL = 'https://files.vendingao.com/files/1754048135294.mp4';
const VIDEO_PATH = `${RNFS.DownloadDirectoryPath}/ad.mp4`;
console.log(VIDEO_PATH)
const ASYNC_KEY = 'adBannerUrl';

const AdBanner = ({ refreshKey, machineId }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [currentAdUrl, setCurrentAdUrl] = useState(null);
  const screenWidth = Dimensions.get('window').width;
  const bannerHeight = screenWidth * 9 / 21;

  useEffect(() => {
    let isMounted = true;
    const fetchAdUrlAndHandleVideo = async () => {
      setError(null);
      let adUrl = null;
      let keypadPassword = null;
      
      try {
        // First, try to get stored ad URL as fallback
        const storedAdUrl = await AsyncStorage.getItem(ASYNC_KEY);
        
        if (!machineId) {
          // If no machineId, use stored URL or default
          adUrl = storedAdUrl || DEFAULT_VIDEO_URL;
        } else {
          try {
            // Try to fetch new ad URL from API
            const res = await getMachineDetails(machineId);
            console.log(res?.data?.data)
            adUrl = res?.data?.data?.adUrl || '';
            keypadPassword = res?.data?.data?.keypadPassword;
            
            if (keypadPassword) {
              await AsyncStorage.setItem('keypadPassword', keypadPassword);
              console.log('keypadPassword', keypadPassword)
            }
          } catch (e) {
            console.log('API call failed, using stored URL:', e.message);
            // If API fails, use stored URL or default
            adUrl = storedAdUrl || DEFAULT_VIDEO_URL;
          }
        }
        
        if (!isMounted) return;
        setCurrentAdUrl(adUrl);
        
        // If no ad URL at all, collapse the banner
        if (!adUrl || adUrl === '') {
          setVideoUri(null);
          setDownloaded(false);
          setDownloading(false);
          return;
        }
        
        // Check if we have a downloaded video for this URL
        const exists = await RNFS.exists(VIDEO_PATH);
        if (storedAdUrl === adUrl && exists) {
          // Video already downloaded for this adUrl
          setVideoUri('file://' + VIDEO_PATH);
          setDownloaded(true);
          setDownloading(false);
          return;
        }
        
        // New adUrl or no downloaded video, download it
        if (storedAdUrl !== adUrl) {
          // Delete old video if exists
          if (exists) {
            try { 
              await RNFS.unlink(VIDEO_PATH); 
            } catch (e) {
              console.log('Failed to delete old video:', e.message);
            }
          }
          await AsyncStorage.setItem(ASYNC_KEY, adUrl);
        }
        
        // Download new video
        setDownloading(true);
        setDownloaded(false);
        setVideoUri(null);
        
        try {
          await RNFS.downloadFile({
            fromUrl: adUrl,
            toFile: VIDEO_PATH,
          }).promise;
          
          if (!isMounted) return;
          setVideoUri('file://' + VIDEO_PATH);
          setDownloaded(true);
        } catch (downloadError) {
          console.log('Download failed, trying to stream:', downloadError.message);
          // If download fails, try to stream the video
          setVideoUri(adUrl);
          setError('Download failed, streaming instead.');
        }
      } catch (e) {
        console.log('General error in ad banner:', e.message);
        setError('Failed to load ad video.');
        // Try to use stored video if available
        const exists = await RNFS.exists(VIDEO_PATH);
        if (exists) {
          setVideoUri('file://' + VIDEO_PATH);
          setDownloaded(true);
        }
      } finally {
        setDownloading(false);
      }
    };
    
    fetchAdUrlAndHandleVideo();
    return () => { isMounted = false; };
  }, [refreshKey, machineId]);

  // Only collapse if we have no ad URL and no stored video
  if (!currentAdUrl || currentAdUrl === '') {
    return null;
  }

  if (downloading) {
    return (
      <View style={[styles.banner, { height: bannerHeight, justifyContent: 'center', alignItems: 'center' }] }>
        <ActivityIndicator size="large" color={" #ff6600"} />
        <Text style={{marginLeft: 8}}>Loading Ad...</Text>
      </View>
    );
  }

  if (error && !videoUri) {
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
      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <Video
        source={{ uri: videoUri }}
        style={{ width: '100%', height: '100%' }}
        controls={false}
        resizeMode="cover"
        repeat
        muted
        onError={(e) => {
          console.log('Video playback error:', e);
          setError('Video playback failed');
        }}
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
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    zIndex: 1,
  },
  errorText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default AdBanner; 