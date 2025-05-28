import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';

export default function TestDownloadPage() {
  const handleDownload = () => {
    const apkUrl = 'https://files.catbox.moe/ccr3re.apk';
    Linking.openURL(apkUrl).catch(err => console.error('Failed to open URL:', err));
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleDownload}>
        <Text style={styles.buttonText}>Download APK</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
