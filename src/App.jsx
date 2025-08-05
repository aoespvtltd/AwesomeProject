import React, { useState, useMemo, useEffect } from 'react';
import { Dimensions, View, PermissionsAndroid, Text, Alert } from 'react-native';
import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendLocationToServer } from './utils/locationUtil';
import { startLastActiveUpdates, stopLastActiveUpdates } from '../components/api/api';


// Import Screens
import Home from './screens/Home';
import Carts from './screens/Carts';
import Checkout from './screens/Checkout'; 
import FillStock from './screens/admin/FillStock';
import FindSerial from './screens/admin/FindSerial';
import Login from './screens/admin/Login';
import ChooseMachine from './screens/admin/ChooseMachine';
import HomeCopy from './screens/Home copyNoBan';
import CheckoutNepal from './screens/CheckoutNepal';
import CheckoutNepalUart from './screens/CheckoutNepalUart';
// import TestLocation from './screens/test/TestLocation';
// import WifiTest from './screens/test/WifiTest';
import AdBanner from '../components/myComp/AdBanner'; 
import Settings from './screens/admin/Settings';
import CheckoutFoneUart from './screens/CheckoutFoneUart';
import CheckoutUartBlank from './screens/CheckoutUartBlank';
import FindSerialUart from './screens/admin/FindSerialUart';
// import AsyncStorageViewer from './screens/test/AsyncStorageViewer';
import { clearCart, updateVendingMachine } from '../components/api/api';

// Define queryClient outside the component
const queryClient = new QueryClient();
const { width } = Dimensions.get('screen');
const dimensions = Dimensions.get('screen');

function App() {
  const [route, setRoute] = useState('home');
  const [refreshKey, setRefreshKey] = useState(0);
  const [machineId, setMachineId] = useState(null);
  const [showAd, setShowAd] = useState(true);
  const [timer, setTimer] = useState(300); // Timer in seconds (e.g., 5 minutes)
  const [lastActiveInterval, setLastActiveInterval] = useState(null);

  // Access queryClient for mutations
  const queryClientInstance = useQueryClient();

  // Define clearCartMutation
  const clearCartMutation = useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      queryClientInstance.invalidateQueries(['cartLength']);
      queryClientInstance.invalidateQueries(['cartData']);
      setRoute('home'); // Navigate to home after clearing cart
      console.log('Cart cleared successfully');
    },
    onError: (error) => {
      console.error('Error clearing cart:', error);
    },
  });

  const screens = {
    home: Home,
    // homecopy: HomeCopy,
    carts: Carts,
    checkout: Checkout,
    fillStock: FillStock,
    findSerial: FindSerial,
    findSerialUart: FindSerialUart,
    login: Login,
    machines: ChooseMachine,
    nepalCheckout: CheckoutNepal,
    nepalUart: CheckoutNepalUart,
    foneUart: CheckoutFoneUart,
    uartBlank: CheckoutUartBlank,
    // testPage: TestLocation,
    // wifi: WifiTest,
    settings: Settings,
    // asyncData: AsyncStorageViewer,
  };

  const CurrentScreen = useMemo(() => screens[route] || Home, [route]);

  // Timer countdown logic
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Call clearCartMutation when timer reaches 0
          if (machineId) {
            clearCartMutation.mutate(machineId);
          }
          return 0;
        }
        return prev - 10;
      });
    }, 10000); // Decrease every second

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [machineId, clearCartMutation]);

  // Function to reset the timer
  const resetTimer = () => {
    setTimer(300); // Reset to 300 minutes
  };

  useEffect(() => {
    console.log(route);
  }, [route]);

  // Start lastActive updates when machineId is available
  useEffect(() => {
    const interval = setInterval(async () => {
      const res= await updateVendingMachine(machineId, {lastActive: new Date().toISOString()});
      // Alert.alert(res.data.data)
      console.log(res.data.data)
    }, 300000); // Decrease every second

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [machineId]);

  useEffect(() => {
    const requestPermission = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission Required',
            message: 'This app needs access to your storage to play videos.',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Storage Permission Granted.');
        } else {
          console.log('Storage Permission Denied.');
        }
      } catch (err) {
        console.warn(err);
      }
    };

    async function getMachineId() {
      let machineId = await AsyncStorage.getItem('machineId');
      if (!machineId) {
        setRoute('login');
      }
      setMachineId(machineId);
      console.log(machineId);
      return machineId;
    }

    getMachineId();
    (async () => {
      const adSetting = await AsyncStorage.getItem('settingsShowAd');
      if (width * dimensions.scale > 1000){
        if (adSetting !== null) setShowAd(adSetting === 'true');
      } else {
        setShowAd(false)
      }
    })();
    console.log(width* dimensions.scale, typeof (width* dimensions.scale));
    sendLocationToServer();
    const timer = setTimeout(() => {
      requestPermission();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  console.log(showAd)

  useEffect(() => {
    if (route === 'home') {
      setRefreshKey((prev) => prev + 1);
    }
  }, [route]);

  const handleAdToggle = (val) => {
    setShowAd(val);
  };

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: 'white' }}>
      {showAd && <AdBanner refreshKey={refreshKey} machineId={machineId} />}
      <CurrentScreen
        route={route}
        setRoute={setRoute}
        onAdToggle={handleAdToggle}
        timer={timer}
        resetTimer={resetTimer}
        style={{ position: 'relative' }}
      />
    </SafeAreaProvider>
  );
}

// Wrap App with QueryClientProvider and PaperProvider
export default function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <App />
      </PaperProvider>
    </QueryClientProvider>
  );
}