import { View, Text, TouchableOpacity, Button, StyleSheet } from 'react-native'
import React from 'react'
import WifiManager from 'react-native-wifi-reborn';
import { ArrowLeft } from 'lucide-react-native';

export default function WifiTest({ setRoute }) {
  const enableWifi = async ()=>{
    await WifiManager.setEnabled(true);
  }

  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => setRoute && setRoute('home')}>
          {/* <Text style={styles.backButtonText}>{'<'}</Text> */}
          <ArrowLeft />
        </TouchableOpacity>
        <Text style={styles.title}>WiFi Test</Text>
        <View style={{ width: 60 }} /> {/* Spacer for symmetry */}
      </View>

      {/* Main content */}
      <Button onPress={enableWifi} title='Enable WiFi' />
      
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 16,
    width: 60,
  },
  backButtonText: {
    fontSize: 40,
    color: '#007AFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    flex: 1,
  },
});