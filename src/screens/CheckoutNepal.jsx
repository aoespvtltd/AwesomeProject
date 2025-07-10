import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {Button, Text, Title, Card, Paragraph} from 'react-native-paper';
import {useMutation, useQuery} from '@tanstack/react-query';
import {ArrowLeft, Home, Loader2, AlertCircle} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import LoadingComp from '../../components/myComp/LoadingComp';
import {
  initiateNepalPay,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {io} from 'socket.io-client';

export async function initializePort(setSerialPort = () => {}) {
  try {
    const devices = await UsbSerialManager.list();

    const result = devices.filter(obj => {
      const strId = obj.deviceId.toString();
      return strId.startsWith('7');
    });
    // console.log(devices)
    if (result && result.length > 0) {
      const granted = await UsbSerialManager.tryRequestPermission(
        result[0].deviceId,
      );
      if (granted) {
        const port = await UsbSerialManager.open(result[0].deviceId, {
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

const CheckoutNepal = ({route, setRoute}) => {
  const [qrCodeData, setQrCodeData] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [countdownText, setCountdownText] = useState('Time remaining');
  const [countdown, setCountdown] = useState(120);
  const [serialPort, setSerialPort] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [socket, setSocket] = useState(null);
  const [success, setSuccess] = useState(false)
  const [amount, setAmount] = useState(false)
  const [error, setError] = useState("")


  // Add a delay utility function
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  const {
    data: payDetails,
    isLoading: payIsLoading,
    error: payError,
  } = useQuery({
    queryKey: ['payDetails'],
    queryFn: async () => {
      const res = await getFonePayDetails();
      await AsyncStorage.setItem("fonepayDetails", JSON.stringify(res.data.data))
      if (!res.data.data.nepalPayDetails){
        setRoute("checkout")
      }
      return res.data.data;
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const res = await initiateNepalPay()
      setQrCodeData(res.data.data.data.qrString)
      console.log(res.data.data.data)
      return res
    },
    onSuccess: async response => {
      const qrData = response.data.data;
      // console.log("data", qrData.totalAmount)
      setAmount(qrData?.totalAmount)

      if (qrData.data.qrString) {
        setQrCodeData(qrData.data.qrString);

        // Initialize Socket.IO connection
        const socket = io("https://vendingao-api.xyz");
        setSocket(socket);

        // Register machine
        const machineId = await AsyncStorage.getItem("machineId");
        // console.log("Registering machine with ID:", machineId);
        socket.emit("register", machineId); // Send machineId directly, not as an object

        // Listen for payment completion
        socket.on("paymentCompleted", async (message) => {
          console.log('Payment completed:', message);
          let paymentData= JSON.parse(message)
          console.log('Payment amount:', paymentData?.amount, 'Expected amount:', qrData.totalAmount);
          
          // Check if the payment amount matches
          if (Number(paymentData.amount) === Number(qrData.totalAmount)) {
            console.log("Payment amount matches, proceeding with payment completion");
            setPaymentSuccess(true);

            try {
              const data = await finalizePayment();
              console.log(data.data)
              setPaymentSuccess(true);
              setCountdownText('Returning to home in');
              setShowReview(true);

              // Use improved serial communication function
              await delay(1000); // Add delay before sending data
              console.log(data.data?.data?.mappedArray);
              const sendSuccess = await sendDataArray3(
                data?.data?.data?.mappedArray,
              );
              
              if (sendSuccess) {
                setSuccess(true)
                setCountdown(10);
                socket.disconnect();
                // Show review for 10 seconds before redirecting
                setTimeout(() => {
                  setShowReview(false);
                  setRoute('home');
                }, 10000);
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
            }
          } else {
            console.log('Payment amount mismatch:', {
              receivedAmount: paymentData.amount,
              expectedAmount: qrData.totalAmount
            });
          }
        });

        socket.on("connect_error", (error) => {
          console.error('Socket connection error:', error);
        });
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
      console.log(cartData.data.data)
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

  // Cleanup socket connection on component unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  useEffect(() => {
    if (countdown <= 90 && countdown >= 5 && paymentMutation.isPending) {
      setError("Error generating QR");
      setCountdown(4);
    }
  }, [countdown, paymentMutation.isPending]);

  async function sendDataArray3(hexStringArr) {
    let hexStringArray = createMotorRunCmdsWithArray(hexStringArr);
    if (!serialPort) {
      Alert.alert('Error', 'No serial connection available');
      return;
    }
    console.log(serialPort, hexStringArray);
    try {
      for (let i = 0; i < hexStringArray.length; i++) {
        // Send current hex string
        const hexString = hexStringArray[i];
        console.log(
          `Sending string ${i + 1}/${hexStringArray.length}: ${hexString}`,
        );
        await serialPort.send(hexString);

        let timeoutTime = 5000;
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
        <TouchableOpacity
          onPress={() => setRoute('nepalUart')}
          style={styles.backButton}>
          <Text style={styles.homeButtonText}>Uart</Text>
        </TouchableOpacity>

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
            {payDetails?.nepalPayDetails && !paymentSuccess && (
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
                disabled={success}
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
            {payDetails?.merchantDetails && !paymentSuccess && (
              <TouchableOpacity
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: '#e2e8f0',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                disabled={success}
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
          </View>

          {paymentMutation.isPending ? (
            <LoadingComp />
          ) : error ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorContent}>
                <AlertCircle size={48} color="#dc2626" style={{alignSelf: 'center', marginBottom: 8}} />
                <Text style={styles.errorTitle}>QR Generation Failed</Text>
                <Text style={styles.errorMessage}>{error}</Text>
                <Text style={styles.errorMessage}>Redirecting to home in {countdown} sec</Text>
              </View>
            </View>
          ) : paymentSuccess ? (
            <View style={styles.messageContainer}>
              <Text style={styles.successText}>Payment Successful!</Text>
              <Text style={styles.messageText}>
                Thank you for the purchase!
              </Text>
              <Text style={styles.messageText}>Have a good day.</Text>
              {showReview && !reviewSubmitted ? (
                <View style={styles.reviewContainer}>
                  <Text style={styles.reviewTitle}>How was your experience?</Text>
                  <View style={styles.reviewButtons}>
                    <TouchableOpacity
                      style={[styles.reviewButton, styles.badButton]}
                      onPress={() => {
                        setCountdown(2)
                        setReviewSubmitted(true);
                        // Here you can add API call to submit the review
                      }}>
                      <Text style={styles.emojiText}>😫</Text>
                      <Text style={styles.reviewLabel}>Bad</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reviewButton, styles.averageButton]}
                      onPress={() => {
                        setCountdown(2)
                        setReviewSubmitted(true);
                        // Here you can add API call to submit the review
                      }}>
                      <Text style={styles.emojiText}>😐</Text>
                      <Text style={styles.reviewLabel}>Average</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reviewButton, styles.goodButton]}
                      onPress={() => {
                        setCountdown(2)
                        setReviewSubmitted(true);
                        // Here you can add API call to submit the review
                      }}>
                      <Text style={styles.emojiText}>😄</Text>
                      <Text style={styles.reviewLabel}>Good</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : reviewSubmitted ? (
                <View style={styles.thankYouContainer}>
                  <Text style={styles.thankYouText}>Thank you for your feedback! 🙏</Text>
                  <Text style={styles.messageText}>
                    Returning to home in {countdown} seconds.
                  </Text>
                </View>
              ) : (
                <Text style={styles.messageText}>
                  Returning to home in {countdown} seconds.
                </Text>
              )}
            </View>
          ) : qrCodeData ? (
            <View style={styles.messageContainer}>
              <Text style={styles.instructionText}>Scan the QR to pay</Text>
              <Text style={styles.subInstructionText}>
                Dispense will start automatically after successful payment
              </Text>
              <Text style={styles.amount}>
                Nrs. {amount || '0'}
              </Text>
              <View style={styles.qrCodeContainer}>
                <QRCode value={qrCodeData} size={200} />
              </View>
            </View>
          ) : (
            <ActivityIndicator />
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
  errorContainer: {
    flex: 1,
    // backgroundColor: '#f8f9fa',
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
    textAlign: "center"
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

export default CheckoutNepal;
