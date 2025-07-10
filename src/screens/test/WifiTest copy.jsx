import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Platform,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import WifiManager from 'react-native-wifi-reborn';
import DebounceTouchableOpacity from '../../../components/myComp/DebounceTouchableOpacity';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';

export default function WifiTest({setRoute}) {
  const [networks, setNetworks] = useState([]);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [wifiEnabled, setWifiEnabled] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Request location permission (required for WiFi scanning on Android)
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs location permission to scan WiFi networks',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Check if WiFi is enabled
  const checkWifiEnabled = async () => {
    try {
      const enabled = await WifiManager.isEnabled();
      setWifiEnabled(enabled);
      return enabled;
    } catch (error) {
      console.log('Error checking WiFi status:', error);
      return false;
    }
  };

  // Enable WiFi
  const enableWifi = async () => {
    try {
      await WifiManager.setEnabled(true);
      setWifiEnabled(true);
      Alert.alert('Success', 'WiFi enabled successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to enable WiFi');
      console.log('Error enabling WiFi:', error);
    }
  };

  // Disable WiFi
  const disableWifi = async () => {
    try {
      await WifiManager.setEnabled(false);
      setWifiEnabled(false);
      Alert.alert('Success', 'WiFi disabled successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to disable WiFi');
      console.log('Error disabling WiFi:', error);
    }
  };

  // Scan for WiFi networks
  const scanNetworks = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Location permission is required to scan WiFi networks');
      return;
    }

    const enabled = await checkWifiEnabled();
    if (!enabled) {
      Alert.alert('WiFi Disabled', 'Please enable WiFi to scan for networks');
      return;
    }

    setIsScanning(true);
    try {
      const wifiList = await WifiManager.loadWifiList();
      const currentSSID = await getCurrentNetwork();
      
      // Filter out the currently connected network
      const filteredNetworks = wifiList.filter(network => 
        network.SSID !== currentSSID
      );
      
      setNetworks(filteredNetworks);
      Alert.alert('Success', `Found ${filteredNetworks.length} available networks`);
    } catch (error) {
      Alert.alert('Error', 'Failed to scan WiFi networks');
      console.log('Error scanning networks:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Get current WiFi connection
  const getCurrentNetwork = async () => {
    try {
      const network = await WifiManager.getCurrentWifiSSID();
      console.log("network", network)
      setCurrentNetwork(network);
      return network;
    } catch (error) {
      console.log('Error getting current network:', error);
      setCurrentNetwork(null);
      return null;
    }
  };

  // Handle network selection
  const handleNetworkSelect = (network) => {
    setSelectedNetwork(network);
    setPassword('');
    setShowPasswordModal(true);
  };

  // Connect to a WiFi network
  const connectToNetwork = async () => {
    if (!selectedNetwork) return;
    
    setIsConnecting(true);
    setShowPasswordModal(false);
    
    try {
      const res = await WifiManager.connectToProtectedSSID(selectedNetwork.SSID, password, false, false);
      console.log(res)
      Alert.alert('Success', `Connected to ${selectedNetwork.SSID}`);
      getCurrentNetwork(); // Refresh current network info
      setSelectedNetwork(null);
      setPassword('');
    } catch (error) {
      Alert.alert('Error', `Failed to connect to ${selectedNetwork.SSID}`);
      console.log('Error connecting to network:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from current network
  const disconnectFromNetwork = async () => {
    try {
      await WifiManager.disconnect();
      Alert.alert('Success', 'Disconnected from current network');
      setCurrentNetwork(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to disconnect');
      console.log('Error disconnecting:', error);
    }
  };

  // Get WiFi signal strength
  const getSignalStrength = async () => {
    try {
      const strength = await WifiManager.getCurrentWifiSignalLevel();
      Alert.alert('Signal Strength', `Current signal level: ${strength}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to get signal strength');
      console.log('Error getting signal strength:', error);
    }
  };

  // Check if network is secure
  const isNetworkSecure = (network) => {
    return network && network.capabilities && (
      network.capabilities.includes('WPA') || 
      network.capabilities.includes('WEP') || 
      network.capabilities.includes('WPS')
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setNetworks([]);
    setCurrentNetwork(null);
    setIsScanning(false);
    setIsConnecting(false);
    setWifiEnabled(false);
    setSelectedNetwork(null);
    setPassword('');
    setShowPasswordModal(false);
    setShowPassword(false);
    // Optionally, re-check WiFi status after a short delay
    setTimeout(() => {
      checkWifiEnabled();
      getCurrentNetwork();
      setRefreshing(false);
    }, 500);
  };

  useEffect(() => {
    checkWifiEnabled();
    getCurrentNetwork();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      
      {/* WiFi Status */}
      <View style={styles.section}>
        <View>
            <View style={{flexDirection: "row", justifyContent: "space-between"}}>
              <DebounceTouchableOpacity style={{padding: 16}} onPress={() => setRoute("home")}>
                <ArrowLeft />
                </DebounceTouchableOpacity> 
                <Text style={styles.title}>WiFi Test</Text>
                <View style={{padding: 20}}></View>
                
                </View>
        <Text style={styles.sectionTitle}>WiFi Status</Text>
        </View>
        <Text style={styles.statusText}>
          WiFi: {wifiEnabled ? 'Enabled' : 'Disabled'}
        </Text>
        <Text style={styles.statusText}>
          Current Network: {currentNetwork || 'Not Connected'}
        </Text>
      </View>

      {/* WiFi Control Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>WiFi Control</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={enableWifi}
            disabled={wifiEnabled}
          >
            <Text style={styles.buttonText}>Enable WiFi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={disableWifi}
            disabled={!wifiEnabled}
          >
            <Text style={styles.buttonText}>Disable WiFi</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Network Operations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Operations</Text>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={scanNetworks}
          disabled={isScanning || !wifiEnabled}
        >
          <Text style={styles.buttonText}>
            {isScanning ? 'Scanning...' : 'Scan Networks'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={getCurrentNetwork}
        >
          <Text style={styles.buttonText}>Get Current Network</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={getSignalStrength}
        >
          <Text style={styles.buttonText}>Get Signal Strength</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={disconnectFromNetwork}
          disabled={!currentNetwork}
        >
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {/* Available Networks */}
      {networks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Networks ({networks.length})</Text>
          {networks.map((network, index) => (
            <TouchableOpacity
              key={index}
              style={styles.networkItem}
              onPress={() => handleNetworkSelect(network)}
            >
              <View style={styles.networkInfo}>
                <Text style={styles.networkSSID}>{network.SSID}</Text>
                <Text style={styles.networkDetails}>
                  Signal: {network.level || 'Unknown'}dBm | Security: {network.capabilities || 'Open'}
                </Text>
                {network && isNetworkSecure(network) && (
                  <Text style={styles.secureText}>🔒 Secure Network</Text>
                )}
              </View>
              <View style={styles.networkAction}>
                <Text style={styles.connectText}>Tap to Connect</Text>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Password Input Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Connect to {selectedNetwork?.SSID || 'Unknown Network'}
            </Text>
            
            {selectedNetwork && isNetworkSecure(selectedNetwork) ? (
              <>
                <Text style={styles.modalSubtitle}>This network requires a password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.modalSubtitle}>This is an open network</Text>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setSelectedNetwork(null);
                  setPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.connectButton]}
                onPress={connectToNetwork}
                disabled={isConnecting || (selectedNetwork && isNetworkSecure(selectedNetwork) && !password.trim())}
              >
                <Text style={styles.connectButtonText}>
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  networkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fafafa',
    marginBottom: 5,
    borderRadius: 6,
  },
  networkInfo: {
    flex: 1,
    marginRight: 10,
  },
  networkSSID: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  networkDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  secureText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
  },
  networkAction: {
    alignItems: 'flex-end',
  },
  connectText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  arrowText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  eyeIcon: {
    padding: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
  },
  connectButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  connectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});