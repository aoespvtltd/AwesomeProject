import React, {useState, useMemo, useRef, useEffect} from 'react';
import {Dimensions, View, PermissionsAndroid, Text, Alert} from 'react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {PaperProvider} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';
// import Video from 'react-native-video';
import RNFS from 'react-native-fs';
import { sendLocationToServer } from './utils/locationUtil';

// Import Screens
// import Home from './screens/test/Home3';
import Home from './screens/HomeFor15Inch';
import Carts from './screens/Carts';
import Checkout from './screens/Checkout';
import FillStock from './screens/admin/FillStock';
import FindSerial from './screens/admin/FindSerial';
import Login from './screens/admin/Login';
import ChooseMachine from './screens/admin/ChooseMachine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeCopy from './screens/Home copy';
import CheckoutNepal from './screens/CheckoutNepal';
import CheckoutNepalUart from './screens/CheckoutNepalUart';
import TestLocation from './screens/test/TestLocation';
import WifiTest from './screens/test/WifiTest';
import AdBanner from '../components/myComp/AdBanner';
import Settings from './screens/admin/Settings';
import CheckoutFoneUart from './screens/CheckoutFoneUart';
import FindSerialUart from './screens/admin/FindSerialUart';


const queryClient = new QueryClient();
const {width} = Dimensions.get('screen');
const dimensions = Dimensions.get('screen');

const videoPath = 'file:///storage/emulated/0/Download/video.mp4'; // Path to the video file

  
function App() {
  const [route, setRoute] = useState('findSerialUart');
  const [refreshKey, setRefreshKey] = useState(0);
  const [machineId, setMachineId] = useState(null);
  const [showAd, setShowAd] = useState(true);


  const screens = {
    home: Home,
    homecopy: HomeCopy,
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
    testPage: TestLocation,
    wifi: WifiTest,
    settings: Settings, // Added Settings
  };

  const CurrentScreen = useMemo(() => screens[route] || Home, [route]);


  useEffect(()=>{
    console.log(route)
  },[route])

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
    // Read ad section toggle from AsyncStorage
    (async () => {
      const adSetting = await AsyncStorage.getItem('settingsShowAd');
      if (adSetting !== null) setShowAd(adSetting === 'true');
    })();
    console.log(width, dimensions)

    // Send location to server on app load
    sendLocationToServer();

    // Delay the permission request to ensure the app is fully initialized
    const timer = setTimeout(() => {
      requestPermission();
    }, 1000); // Delay by 1 second

    return () => clearTimeout(timer);
  }, []);

  // Refresh ad banner when returning to Home
  useEffect(() => {
    if (route === 'home') {
      setRefreshKey(prev => prev + 1);
    }
  }, [route]);

  const handleAdToggle = (val) => {
    setShowAd(val);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <SafeAreaProvider style={{flex: 1, backgroundColor: 'white'}}>
          {/* Ad banner at the top, only if enabled */}
          {showAd && <AdBanner refreshKey={refreshKey} machineId={machineId} />}
          {/* Render the selected screen */}
          <CurrentScreen
            route={route}
            setRoute={setRoute}
            onAdToggle={handleAdToggle}
            style={{position: 'relative'}}
          />
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}

export default App;
