import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {Button, Text, Title, Card, Paragraph} from 'react-native-paper';
import {useMutation, useQuery} from '@tanstack/react-query';
import {ArrowLeft, Home} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import LoadingComp from '../../components/myComp/LoadingComp';
import {
  initiatePayment,
  finalizePayment,
  clearCart,
  getCartItems,
  getUnpaidCartsByMachine,
  getFonePayDetails,
} from '../../components/api/api';
import {
  UsbSerialManager,
  UsbSerial,
  Parity,
} from 'react-native-usb-serialport-for-android';
import {generateCommand} from '../utils/generatorFn';
import {createMotorRunCmdsWithArray} from '../utils/serialDetail';

export async function initializePort(setSerialPort = () => {}) {
  try {
    const devices = await UsbSerialManager.list();
    console.log(devices);
    // Alert.alert(devices)
    if (!devices) {
      Alert.alert('No devices found');
    }
    if (devices && devices.length > 0) {
      const granted = await UsbSerialManager.tryRequestPermission(
        devices[0].deviceId,
      );
      if (granted) {
        const port = await UsbSerialManager.open(devices[0].deviceId, {
          baudRate: 9600,
          parity: Parity.None,
          dataBits: 8,
          stopBits: 1,
        });
        setSerialPort(port);
      }
    }
  } catch (error) {
    console.error('Failed to initialize serial port:', error);
  }
}

const Checkout = ({route, setRoute}) => {
  const [qrCodeData, setQrCodeData] = useState('');
  const [orderId, setOrderId] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [isScanned, setIsScanned] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [countdownText, setCountdownText] = useState('Time remaining');
  const [countdown, setCountdown] = useState(120);
  const [serialPort, setSerialPort] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const MAX_RETRY_ATTEMPTS = 3;

  // Add a delay utility function
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Improved serial communication function with retries
  const sendDataWithRetries = async (data, maxRetries = 3) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Initialize port if not connected
        if (!serialPort || attempt > 0) {
          await delay(1000); // Add delay before reconnection attempt
          const devices = await UsbSerialManager.list();
          if (!devices || devices.length === 0) continue;

          const granted = await UsbSerialManager.tryRequestPermission(
            devices[0].deviceId,
          );
          if (!granted) continue;

          const port = await UsbSerialManager.open(devices[0].deviceId, {
            baudRate: 9600,
            parity: Parity.None,
            dataBits: 8,
            stopBits: 1,
          });
          setSerialPort(port);
        }

        // Send data with delay
        await delay(500);
        const hexData = stringToHex(generateCommand(data));
        await serialPort.send(hexData);
        console.log('Data sent successfully:', hexData);
        return true;
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        if (serialPort) {
          try {
            await serialPort.close();
          } catch (e) {
            console.error('Error closing port:', e);
          }
        }
        setSerialPort(null);

        if (attempt === maxRetries) {
          Alert.alert(
            'Communication Error',
            'Failed to send data to device. Please try again.',
          );
          return false;
        }
      }
    }
    return false;
  };

  const {
    data: payDetails,
    isLoading: payIsLoading,
    error: payError,
  } = useQuery({
    queryKey: ['payDetails'],
    queryFn: async () => {
      const res = await getFonePayDetails();
      return res.data.data;
    },
  });

  const paymentMutation = useMutation({
    mutationFn: initiatePayment,
    onSuccess: async response => {
      const data = response.data.data;
      setOrderId(data.prn);
      setWsUrl(data.wsUrl);

      if (data.qrMessage) {
        setQrCodeData(data.qrMessage);

        const ws = new WebSocket(data.wsUrl);

        ws.onmessage = async event => {
          const jsonData = JSON.parse(event.data);
          console.log('Received WebSocket message:', jsonData);

          if (jsonData.transactionStatus) {
            const status = JSON.parse(jsonData.transactionStatus);

            if (status.qrVerified) {
              setIsScanned(true);
            }

            if (status.paymentSuccess) {
              setPaymentSuccess(true);

              try {
                await finalizePayment();
                setPaymentSuccess(true);
                setCountdownText('Returning to home in');

                // Use improved serial communication function
                await delay(1000); // Add delay before sending data
                const sendSuccess = await sendDataArray3(
                  data?.pnAndQntyArrForNewMod,
                );
                if (sendSuccess) {
                  setCountdown(5);
                  ws.close();
                  setTimeout(() => setRoute('home'), 5000);
                } else {
                  // Handle failed communication
                  Alert.alert(
                    'Error',
                    'Failed to communicate with device. Your payment was successful, but please contact support.',
                    [
                      {
                        text: 'Return to Home',
                        onPress: () => setRoute('home'),
                      },
                    ],
                  );
                }
              } catch (error) {
                console.error('Error in payment process:', error);
                // Alert.alert("Error", "There was an error processing your payment");
              }
            }
          }
        };

        ws.onerror = error => {
          console.error('WebSocket error:', error);
        };
      }
    },
    onError: error => {
      console.error('Error initiating payment:', error);
    },
  });

  const {
    data: cartItems,
    isLoading: cartLoading,
    error: cartError,
    refetch: cartRefetch,
  } = useQuery({
    queryKey: ['cartItems'],
    queryFn: async () => {
      let cartData = await getUnpaidCartsByMachine();
      return cartData;
    },
  });

  // Initialize serial port when component mounts
  useEffect(() => {
    initializePort(setSerialPort);
    paymentMutation.mutate();

    const interval = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      if (serialPort) {
        serialPort.close().catch(console.error);
      }
    };
  }, []);

  function stringToHex(str) {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i).toString(16).padStart(2, '0');
      hex += charCode;
    }
    return hex;
  }

  async function sendDataArray3(hexStringArr) {
    if (!serialPort) {
      Alert.alert('Error', 'No serial connection available');
      return;
    }
    let hexStringArray = createMotorRunCmdsWithArray(hexStringArr);
    console.log(serialPort);
    try {
      for (let i = 0; i < hexStringArray.length; i++) {
        // Send current hex string
        const hexString = hexStringArray[i];
        console.log(
          `Sending string ${i + 1}/${hexStringArray.length}: ${hexString}`,
        );
        await serialPort.send(hexString);

        let timeoutTime = 5000;
        // if (hexStringArr[i][0] <= 10){
        //   timeoutTime = 5000
        // }else{
        //   timeoutTime = 10000;
        // }

        // Don't wait after the last string
        if (i < hexStringArray.length - 1) {
          // Wait for 3 seconds before sending next string
          await new Promise(resolve => setTimeout(resolve, timeoutTime));
        }
      }
      return true;
    } catch (error) {
      console.error('Error sending data:', error);
    }
  }

  if (payError)
    return (
      <Text>
        Error occured while finding out which payment system to use. Be sure to
        have properly configured your device or your internet is fine.
      </Text>
    );

    if (countdown <= 0) {
      clearCart().then(()=>{
  
        setRoute('home');
      })
    }

  return (
    <View style={styles.mainContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setRoute('carts')}
          style={styles.backButton}>
          <ArrowLeft color="#000" size={24} />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity onPress={()=>{
          sendDataArray3([1,2])
        }}>
          <Text>Test</Text>
        </TouchableOpacity> */}

        <TouchableOpacity
          onPress={() => setRoute('home')}
          style={styles.homeButton}>
          <Text style={styles.homeButtonText}>Home</Text>
        </TouchableOpacity>
      </View>

      {/* Cart Preview Section */}
      <View style={styles.cartPreview}>
        {/* <Text style={styles.cartPreviewTitle}>Order Summary</Text> */}
        <ScrollView style={styles.cartItemsScroll}>
          <View style={styles.tableRow}>
            <Text style={styles.productCell}>Product</Text>
            <Text style={[styles.productCell, styles.centerCell]}>Qty</Text>
            <Text style={[styles.productCell, styles.rightCell]}>Amount</Text>
          </View>
          {cartItems?.data?.data.map(item => (
            <View key={item._id} style={styles.tableRow}>
              <Text style={styles.productCell} numberOfLines={2}>
                {item.productId.name}
              </Text>
              <Text style={[styles.qtyCell, styles.centerCell]}>
                {item.quantity}
              </Text>
              <Text style={[styles.amountCell, styles.rightCell]}>
                Rs. {item.productId.price * item.quantity}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Payment Section */}
      <ScrollView style={styles.paymentSection}>
        <View style={styles.contentContainer}>
          <View style={styles.paymentSection}>
            <Text style={styles.paymentText}>We Accept</Text>

            <View style={{flexDirection: 'row', gap: 12}}>
              {payDetails?.nepalPayDetails !== null ? (<TouchableOpacity
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: '#e2e8f0',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => setRoute('nepalCheckout')}>
                <Image
                  style={{width: 120, height: 50}}
                  source={{
                    uri: 'https://files.catbox.moe/qhwpwg.png',
                  }}
                  resizeMode="contain"
                />
              </TouchableOpacity>): ()=>{setRoute("checkout"); return <></>}}
              {payDetails?.merchantDetails !== null ? (
              <TouchableOpacity
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: '#f97316',
                  backgroundColor: '#fff7ed',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => setRoute('checkout')}>
                <Image
                  style={{width: 120, height: 50}}
                  source={{
                    uri: 'https://login.fonepay.com/assets/img/fonepay_payments_fatafat.png',
                  }}
                  resizeMode="contain"
                />
              </TouchableOpacity>): ()=>setRoute("nepalCheckout")}

            </View>
          </View>

          {paymentSuccess ? (
            <View style={styles.messageContainer}>
              <Text style={styles.successText}>Payment Successful!</Text>
              <Text style={styles.messageText}>
                Thank you for the purchase!
              </Text>
              <Text style={styles.messageText}>Have a good day.</Text>
              <Text style={styles.messageText}>
                Returning to home in {countdown} seconds.
              </Text>
            </View>
          ) : isScanned ? (
            <View style={styles.messageContainer}>
              <Text style={styles.processingText}>
                QR Code Scanned! Processing payment...
              </Text>
              <View style={styles.qrCodeContainer}>
                <QRCode value={qrCodeData} size={200} />
              </View>
            </View>
          ) : qrCodeData ? (
            <View style={styles.messageContainer}>
              <Text style={styles.instructionText}>Scan the QR to pay</Text>
              <Text style={styles.subInstructionText}>
                Dispense will start automatically after successful payment
              </Text>
              <Text style={styles.amount}>
                Nrs. {paymentMutation?.data?.data?.data?.amount || '0'}
              </Text>
              <View style={styles.qrCodeContainer}>
                <QRCode value={qrCodeData} size={200} />
              </View>
            </View>
          ) : (
            <LoadingComp />
          )}
        </View>

      </ScrollView>

      {/* Footer with countdown */}
      <View style={styles.countdownContainer}>
        <Text style={styles.countdown}>
          {countdownText}: {Math.floor(countdown / 60)}:
          {String(countdown % 60).padStart(2, '0')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  homeButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f97316',
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
  },
  homeButtonText: {
    marginHorizontal: 8,
    fontSize: 16,
    color: '#fff',
  },
  cartPreview: {
    backgroundColor: '#fff',
    padding: 16,
    maxHeight: '25%',
  },
  cartPreviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  cartItemsScroll: {
    flexGrow: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  productCell: {
    flex: 2,
    fontSize: 14,
    color: '#1f2937',
  },
  qtyCell: {
    flex: 0.5,
    fontSize: 14,
    color: '#1f2937',
  },
  amountCell: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  centerCell: {
    textAlign: 'center',
  },
  rightCell: {
    textAlign: 'right',
  },
  paymentSection: {
    flex: 1,
    // padding: 16,
  },
  contentContainer: {
    padding: 16,
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    fontWeight: 'semibold',
    marginBottom: 8,
  },
  paymentLogo: {
    width: 150,
    height: 35,
    overflow: 'hidden',
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f97316',
    marginBottom: 8,
  },
  countdownContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  countdown: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  messageContainer: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    width: '100%',
  },
  successText: {
    fontSize: 24,
    color: '#22c55e',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  processingText: {
    fontSize: 18,
    color: '#f97316',
    // marginBottom: 16,
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subInstructionText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrCodeContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 3,
  },
});

export default Checkout;
