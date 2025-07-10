import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import FileViewer from 'react-native-file-viewer';
import RNFS from 'react-native-fs';

export default function OpenFilePage() {
  const handleOpenFile = async () => {
    try {
      // const filePath = `${RNFS.DownloadDirectoryPath}/app-release.apk`; // Replace with your actual file path
      // const filePath="/storage/emulated/0/Download/files/app-release.apk"
      const filePath="/storage/emulated/0/Android/data/com.awesomeproject/files/app-release.apk"


      const exists = await RNFS.exists(filePath);
      if (!exists) {
        Alert.alert('File Not Found', `No file exists at: ${filePath}`);
        return;
      }

      await FileViewer.open(filePath, { showOpenWithDialog: true });
      console.log('File opened successfully!');
    } catch (error) {
      console.error('Failed to open file:', error);
      Alert.alert('Error', 'Unable to open file.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleOpenFile}>
        <Text style={styles.buttonText}>Open File</Text>
      </TouchableOpacity>
    </View>
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
    backgroundColor: '#28a745',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
