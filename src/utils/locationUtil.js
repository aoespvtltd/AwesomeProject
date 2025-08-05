import { PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { getMachineId, uploadMachineLocation } from '../../components/api/api';

// Request location permission
export const requestLocationPermission = async () => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Geolocation Permission',
        message: 'Can we access your location?',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED || granted === 'granted') {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.error('Error requesting location permission:', err);
    return false;
  }
};

// Get current location (returns a Promise)
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    try {
      Geolocation.getCurrentPosition(
        position => resolve(position),
        error => {
          console.error('Geolocation error:', error);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch (error) {
      console.error('Error getting current location:', error);
      reject(error);
    }
  });
};

// Send location to server
export const sendLocationToServer = async () => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.log('Location permission denied');
      return false;
    }
    
    const position = await getCurrentLocation();
    const machineId = await getMachineId();
    
    if (!machineId) {
      console.log('No machine ID available for location upload');
      return false;
    }
    
    const res = await uploadMachineLocation(machineId, position.coords);
    return res.data;
  } catch (err) {
    console.log('Error sending location:', err);
    return false;
  }
}; 