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
    return false;
  }
};

// Get current location (returns a Promise)
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => resolve(position),
      error => reject(error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });
};

// Send location to server
export const sendLocationToServer = async () => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return false;
  try {
    const position = await getCurrentLocation();
    const machineId = await getMachineId();
    if (!machineId) return false;
    const res = await uploadMachineLocation(machineId, position.coords);
    return res.data;
  } catch (err) {
    console.log('Error sending location:', err);
    return false;
  }
}; 