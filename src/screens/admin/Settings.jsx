import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft } from 'lucide-react-native';
import WifiManager from 'react-native-wifi-reborn'; // Assuming this is used in WifiTest.jsx
import Keypad from '../../../components/myComp/Keypad';
import DebounceTouchableOpacity from '../../../components/myComp/DebounceTouchableOpacity';

const SETTINGS_AD_KEY = 'settingsShowAd';

const Settings = ({ setRoute, onAdToggle }) => {
  const [wifiEnabled, setWifiEnabled] = useState(false);
  const [showAd, setShowAd] = useState(true);
  const [showKeypad, setShowKeypad] = useState(false);
  const [number, setNumber] = useState('');
  const [wifiLoading, setWifiLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const adSetting = await AsyncStorage.getItem(SETTINGS_AD_KEY);
      if (adSetting !== null) setShowAd(adSetting === 'true');
    })();
    // Check WiFi status (dummy, as Android doesn't allow reading WiFi state directly without permissions)
    // You can use WifiManager.isEnabled() if available, else leave as is
  }, []);

  const toggleWifi = async () => {
    setWifiLoading(true);
    try {
      if (wifiEnabled) {
        await WifiManager.setEnabled(false);
        setWifiEnabled(false);
      } else {
        await WifiManager.setEnabled(true);
        setWifiEnabled(true);
      }
    } catch (e) {
      // fallback: just toggle UI
      setWifiEnabled((prev) => !prev);
    }
    setWifiLoading(false);
  };

  const toggleAd = async () => {
    const newValue = !showAd;
    setShowAd(newValue);
    await AsyncStorage.setItem(SETTINGS_AD_KEY, newValue.toString());
    if (onAdToggle) onAdToggle(newValue);
  };

  const handleKeypadInput = (val) => {
    if (val === 'del') {
      setNumber((prev) => prev.slice(0, -1));
    } else if (val === 'ok') {
      setShowKeypad(false);
    } else if (number.length < 10 && /^[0-9]$/.test(val)) {
      setNumber((prev) => prev + val);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <DebounceTouchableOpacity onPress={() => setRoute('home')} style={styles.backButton}>
          <ArrowLeft size={24} color="black" />
        </DebounceTouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>
      <View paddingHorizontal= {24}>
      <View style={styles.row}>
        <Text style={styles.label}>WiFi</Text>
        <Switch value={wifiEnabled} onValueChange={toggleWifi} disabled={wifiLoading} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Show Ad Section</Text>
        <Switch value={showAd} onValueChange={toggleAd} />
      </View>
      {/* Placeholder for more settings */}
      <View style={styles.row}>
        <Text style={styles.label}>More settings coming soon...</Text>
      </View>
      {showKeypad && (
        <View style={styles.keypadContainer}>
          <Keypad onPress={handleKeypadInput} />
        </View>
      )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    elevation: 2,
    gap: 12,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '500',
  },
  numberBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  numberText: {
    fontSize: 18,
    color: '#333',
  },
  keypadContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderColor: '#eee',
    paddingBottom: 24,
  },
});

export default Settings; 