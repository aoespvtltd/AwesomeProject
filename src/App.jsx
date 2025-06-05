import React, {useState, useMemo, useRef, useEffect} from 'react';
import {Dimensions, View, PermissionsAndroid, Text, Alert} from 'react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {PaperProvider} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';
// import Video from 'react-native-video';
import RNFS from 'react-native-fs';

// Import Screens
// import Home from './screens/test/Home3';
import Home from './screens/Home';
import Carts from './screens/Carts';
import Checkout from './screens/Checkout';
import FillStock from './screens/FillStock';
import FindSerial from './screens/FindSerial';
import Login from './screens/Login';
import ChooseMachine from './screens/ChooseMachine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CheckoutNepalPay from './screens/test/CheckoutNepalPay';
import HomeCopy from './screens/Home copy';
import Review from './screens/Review';
import TestDownloadPage from './screens/test/testDownloadPage';
import CheckoutNepal from './screens/CheckoutNepal';
import UartScreen from './screens/UartScreen';
const queryClient = new QueryClient();
const {width} = Dimensions.get('window');

const videoPath = 'file:///storage/emulated/0/Download/video.mp4'; // Path to the video file

  
function App() {
  const [route, setRoute] = useState('home');


  const screens = {
    home: Home,
    homecopy: HomeCopy,
    carts: Carts,
    checkout: Checkout,
    fillstock: FillStock,
    findserial: FindSerial,
    login: Login,
    machines: ChooseMachine,
    nepalCheckout: CheckoutNepal,
    // nepalCheckout: CheckoutNepalPay,
    test: TestDownloadPage,
    uart: UartScreen
  };

  const CurrentScreen = useMemo(() => screens[route] || Home, [route]);


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
      console.log(machineId);
      return machineId;
    }

    getMachineId();

    // Delay the permission request to ensure the app is fully initialized
    const timer = setTimeout(() => {
      requestPermission();
    }, 1000); // Delay by 1 second

    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <SafeAreaProvider style={{flex: 1, backgroundColor: 'white'}}>
        {/* <TestUpdate /> */}
          {/* Render the selected screen */}
          <CurrentScreen
            route={route}
            setRoute={setRoute}
            style={{position: 'relative'}}
          />
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}

export default App;
