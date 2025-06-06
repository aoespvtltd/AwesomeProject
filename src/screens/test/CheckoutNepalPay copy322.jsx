import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {ArrowLeft} from 'lucide-react-native';
import init from 'react_native_mqtt';
import {UsbSerialManager} from 'react-native-usb-serialport-for-android';
import {
  initiateNepalPay,
  getUnpaidCartsByMachine,
  machineId,
  finalizePayment,
  clearCart,
  getFonePayDetails,
} from '../../../components/api/api';
import {createMotorRunCmdsWithArray} from '../../utils/serialDetail';
import {useMutation, useQuery} from '@tanstack/react-query';
import LoadingComp from '../../../components/myComp/LoadingComp';

let client;

export default function PaymentScreen({setRoute}) {
  const [connected, setConnected] = useState(false);
  const [serialPort, setSerialPort] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState('Scan the QR to pay');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const [qrString, setQrString] = useState('');
  const [amount, setAmount] = useState(0);
  const [validationTraceId, setValidationTraceId] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [mqttClient, setMqttClient] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const topic = `lphaVend/${machineId}/payment`;

  const initializePort = async () => {
    try {
      const devices = await UsbSerialManager.list();

      const result = devices.filter(obj => {
        const strId = obj.deviceId.toString();
        return strId.startsWith('7');
      });
      if (result && result.length > 0) {
        const granted = await UsbSerialManager.tryRequestPermission(
          result[0].deviceId,
        );
        if (granted) {
          const port = await UsbSerialManager.open(result[0].deviceId, {
            baudRate: 9600,
            parity: 0,
            dataBits: 8,
            stopBits: 1,
          });
          setSerialPort(port);
          return port;
        }
      } else {
        Alert.alert('No USB device found');
      }
    } catch (error) {
      console.error('Serial port init failed:', error);
    }
  };

  const {
    data: payDetails,
    isLoading: payIsLoading,
    error: payError,
  } = useQuery({
    queryKey: ['payDetails'],
    queryFn: async () => {
      try {
        const res = await getFonePayDetails();
        
        if (!res?.data?.data?.nepalPayDetails) {
          console.log('No NepalPay details found, redirecting to checkout');
          setRoute("checkout");
        }
        return res?.data?.data;
      } catch (error) {
        console.error('Error fetching pay details:', error);
        throw error;
      }
    },
  });

  // Add a useEffect to monitor payDetails changes
  // useEffect(() => {
  //   console.log('PayDetails updated:', payDetails);
  // }, [payDetails]);

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const res = await initiateNepalPay();
      setQrString(res?.data.data.data.qrString);
      setValidationTraceId(res?.data.data.data.validationTraceId);
      setAmount(res?.data.data.totalAmount);
      const qr = res?.data?.data?.data?.qrString;

      if (!qr) throw new Error('QR code not found in response');
      return res;
    },
    onError: err => {
      console.error(err);
      // Alert.alert('Payment QR Error', err.message || 'Something went wrong');
    },
  });

  const {data: cartItems, isLoading: cartLoading} = useQuery({
    queryKey: ['cartItems'],
    queryFn: getUnpaidCartsByMachine,
  });

  const sendDataArray3 = async motorArray => {
    // console.log(serialPort);
    // if (!serialPort) {
    //   Alert.alert('Error', 'No serial connection');
    //   return;
    // }

    const hexStringArray = createMotorRunCmdsWithArray(motorArray);

    try {
      for (let i = 0; i < hexStringArray.length; i++) {
        await serialPort.send(hexStringArray[i]);
        // const delay = motorArray[i][0] <= 10 ? 5000 : 10000;
        if (i < hexStringArray.length - 1) {
          await new Promise(res => setTimeout(res, 5000));
        }
      }
      return true;
    } catch (error) {
      console.error('Error sending data:', error);
    }
  };

  // Initialize MQTT client once
  useEffect(() => {
    if (!cartItems?.data?.data) return;

    const initializeMQTT = () => {
      init({
        size: 10000,
        storageBackend: AsyncStorage,
        defaultExpires: 1000 * 3600 * 24,
        enableCache: true,
        reconnect: true,
        sync: {},
      });

      const newClient = new Paho.MQTT.Client(
        'mqtt.eclipseprojects.io',
        443,
        `client-${Math.random().toString(16).substr(2, 8)}`,
      );

      newClient.onConnectionLost = res => {
        if (res.errorCode !== 0) {
          console.log('🔌 Connection lost:', res.errorMessage);
          setConnected(false);
        }
      };

      newClient.onMessageArrived = async message => {
        console.log('📩 MQTT Message:', message.payloadString);
        
        // Prevent multiple processing of the same payment
        if (isProcessingPayment) {
          console.log('Payment is already being processed, ignoring duplicate message');
          return;
        }

        try {
          setIsProcessingPayment(true);
          const data = await finalizePayment();
          console.log("data: ", data?.data?.data?.pnAndQntyArrForNewMod);
          
          if (amount != data?.data?.data?.totalAmount) {
            Alert.alert("The amount from data didn't match the qr.");
            // setIsProcessingPayment(false);
            // return;
          }
          
          const port = await initializePort();
          if (port) {
            await sendDataArray3(data?.data?.data?.pnAndQntyArrForNewMod);
            setCountdown(10);
            setQrString(null);
            setSuccess(true);
            setShowReview(true);
            // Show review for 10 seconds before redirecting
            setTimeout(() => {
              setShowReview(false);
              setRoute('home');
            }, 10000);
          }
        } catch (error) {
          console.error('Error processing payment:', error);
          Alert.alert('Error', 'Failed to process payment. Please try again.');
        } finally {
          setIsProcessingPayment(false);
        }
      };

      newClient.connect({
        onSuccess: () => {
          setConnected(true);
          newClient.subscribe(topic);
          setMqttClient(newClient);
        },
        useSSL: true,
        onFailure: err => {
          console.error('❌ MQTT connection failed:', err);
        },
      });
    };

    initializeMQTT();

    return () => {
      if (mqttClient && connected) {
        mqttClient.disconnect();
      }
    };
  }, [cartItems?.data?.data]); // Remove serialPort from dependencies

  // Separate useEffect for serial port initialization
  useEffect(() => {
    initializePort();
  }, []);

  useEffect(() => {
    let port = initializePort();
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

  if (countdown <= 0) {
    clearCart().then(() => {
      setRoute('home');
    });
  }

  // if (!paymentMutation.isPending){
  //   const qrString = paymentMutation?.data?.data?.data?.qrString;
  //   const amount = paymentMutation?.data?.data?.data?.amount;
  // }

  // if (payError){
  //   return (
  //     <View style={styles.errorContainer}>
  //       <View style={styles.errorContent}>
  //         <Text style={styles.errorTitle}>Connection Error</Text>
  //         <Text style={styles.errorMessage}>
  //           Error occurred while finding out which payment system to use. Please ensure:
  //         </Text>
  //         <View style={styles.errorList}>
  //           <Text style={styles.errorListItem}>• Your device is properly configured</Text>
  //           <Text style={styles.errorListItem}>• You have a stable internet connection</Text>
  //         </View>
  //         <TouchableOpacity
  //           style={styles.refreshButton}
  //           onPress={() => setRoute("checkout")}>
  //           <Text style={styles.refreshButtonText}>Try Again</Text>
  //         </TouchableOpacity>
  //       </View>
  //     </View>
  //   );
  // }

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

        {/* <TouchableOpacity onPress={() => sendDataArray3([[1, 2]])}>
          <Text>Test</Text>
        </TouchableOpacity> */}

        <TouchableOpacity
          onPress={() => setRoute('home')}
          style={styles.homeButton}>
          <Text style={styles.homeButtonText}>Home</Text>
        </TouchableOpacity>
      </View>

      {/* Cart Preview */}
      <View style={styles.cartPreview}>
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
          <Text style={styles.paymentText}>We Accept</Text>
          <View style={{flexDirection: 'row', gap: 12}}>
            {payDetails?.nepalPayDetails && (
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
                onPress={() => setRoute('nepalCheckout')}>
                <Image
                  style={{width: 120, height: 50}}
                  source={{
                    uri: 'https://files.catbox.moe/qhwpwg.png',
                  }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
            {payDetails?.merchantDetails && (
              <TouchableOpacity
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: '#e2e8f0',
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
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.instructionText}>
              {success ? (
                showReview && !reviewSubmitted ? (
                  <View style={styles.reviewContainer}>
                    <Text style={styles.reviewTitle}>
                      How was your experience?
                    </Text>
                    <View style={styles.reviewButtons}>
                      <TouchableOpacity
                        style={[styles.reviewButton, styles.badButton]}
                        onPress={() => {
                          setReviewSubmitted(true);
                          // Here you can add API call to submit the review
                        }}>
                        <Text style={styles.emojiText}>😫</Text>
                        <Text style={styles.reviewLabel}>Bad</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reviewButton, styles.averageButton]}
                        onPress={() => {
                          setReviewSubmitted(true);
                          // Here you can add API call to submit the review
                        }}>
                        <Text style={styles.emojiText}>😐</Text>
                        <Text style={styles.reviewLabel}>Average</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reviewButton, styles.goodButton]}
                        onPress={() => {
                          setReviewSubmitted(true);
                          setCountdown(2)
                          // Here you can add API call to submit the review
                        }}>
                        <Text style={styles.emojiText}>😄</Text>
                        <Text style={styles.reviewLabel}>Good</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : reviewSubmitted ? (
                  <View style={styles.thankYouContainer}>
                    <Text style={styles.thankYouText}>
                      Thank you for your feedback! 🙏
                    </Text>
                    <Text style={styles.messageText}>
                      Returning to home in {countdown} seconds.
                    </Text>
                  </View>
                ) : (
                  `Returning to home in ${countdown} ...`
                )
              ) : (
                paymentMessage
              )}
            </Text>
            {!success && (paymentMutation.isPending ? (
              <LoadingComp />
            ) : qrString ? (
              <>
                <Text style={styles.amount}>Nrs. {amount || '0'}</Text>
                <View style={styles.qrCodeContainer}>
                  <QRCode value={qrString} size={200} />
                </View>
              </>
            ) : (
              <LoadingComp />
            ))}
          </View>
        </View>
        <View style={styles.noPaymentContainer}>
          <Text style={styles.noPaymentText}>No </Text>
          <Image
            style={styles.noPaymentLogo}
            source={{uri: 'https://files.catbox.moe/kue53z.png'}}
            resizeMode="contain"
          />
        </View>
      </ScrollView>

      {/* Countdown */}
      <View style={styles.countdownContainer}>
        <Text style={styles.countdown}>
          Time Remaining: {Math.floor(countdown / 60)}:
          {String(countdown % 60).padStart(2, '0')}
        </Text>
      </View>
    </View>
  );
}

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
    // alignItems: "center"
    // padding: 16,
  },
  contentContainer: {
    paddingTop: 16,
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
    // backgroundColor: "red"
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
    // padding: 10,
    borderRadius: 12,
    marginTop: 20,
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
  noPaymentContainer: {
    margin: 16,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  noPaymentText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
  },
  noPaymentLogo: {
    width: 60,
    height: 20,
    // marginLeft: 4,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 16,
    lineHeight: 22,
  },
  errorList: {
    marginBottom: 24,
  },
  errorListItem: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: '#f97316',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  reviewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  reviewButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emojiText: {
    fontSize: 40,
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  badButton: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  averageButton: {
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  goodButton: {
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  thankYouContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  thankYouText: {
    fontSize: 18,
    color: '#22c55e',
    fontWeight: 'bold',
    marginBottom: 8,
  },
});
