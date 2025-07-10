import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import RNFS from 'react-native-fs';
import Video from 'react-native-video';

const VIDEO_URL = 'https://your-server.com/ad.mp4'; // Replace with your video URL
const VIDEO_PATH = `${RNFS.DownloadDirectoryPath}/ad.mp4`;
const AD_LINK = 'https://your-ad-link.com'; // Replace with your ad link

const AdScreen = () => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAndDownload = async () => {
      try {
        const exists = await RNFS.exists(VIDEO_PATH);
        if (!exists) {
          setDownloading(true);
          await RNFS.downloadFile({
            fromUrl: VIDEO_URL,
            toFile: VIDEO_PATH,
          }).promise;
          setDownloaded(true);
        } else {
          setDownloaded(true);
        }
      } catch (e) {
        setError('Failed to download ad video.');
      } finally {
        setDownloading(false);
      }
    };
    checkAndDownload();
  }, []);

  if (downloading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Downloading Ad...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text>{error}</Text>
      </View>
    );
  }

  if (!downloaded) {
    return (
      <View style={styles.centered}>
        <Text>Preparing ad...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <Video
        source={{ uri: 'file://' + VIDEO_PATH }}
        style={{ flex: 1 }}
        controls
        resizeMode="contain"
        repeat
      />
      <TouchableOpacity
        style={styles.linkContainer}
        onPress={() => Linking.openURL(AD_LINK)}
      >
        <Text style={styles.linkText}>
          Learn More
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  linkContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  linkText: {
    color: 'deepskyblue',
    fontSize: 18,
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
});

export default AdScreen; 