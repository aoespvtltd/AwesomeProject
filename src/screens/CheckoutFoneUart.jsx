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
import {AlertCircle, ArrowLeft, Home, Loader2} from 'lucide-react-native';
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
import {generateCommand} from '../utils/generatorFn';
import {createMotorRunCmdsWithArray} from '../utils/serialDetail';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useUart from '../hooks/useUart';

const Checkout = ({route, setRoute}) => {
  const [qrCodeData, setQrCodeData] = useState('');
  const [orderId, setOrderId] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [isScanned, setIsScanned] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [countdownText, setCountdownText] = useState('Time remaining');
  const [countdown, setCountdown] = useState(120);
  const [showReview, setShowReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [error, setError] = useState("")

  const {
    isConnected,
    sendMessage,
    handleRefresh,
  } = useUart();

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
      if (!res.data.data.fonePayDetails){
        setRoute("foneUart")
      }
      return res.data.data;
    },
  });

  const paymentMutation = useMutation({
    mutationFn: initiatePayment,
    onSuccess: async response => {
      const data = response.data.data;
      console.log(data)
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
                console.log("object")
                const payData = await finalizePayment();
                setPaymentSuccess(true);
                setCountdownText('Returning to home in');
                setShowReview(true);

                // Use improved UART communication function
                await delay(1000); // Add delay before sending data
                console.log("payData", payData)
                const sendSuccess = await sendDataArray3(
                  payData?.data?.data?.mappedArray,
                );
                if (sendSuccess) {
                  setCountdown(10);
                  ws.close();
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

  
  useEffect(() => {
    if (countdown <= 90 && countdown >= 5 && paymentMutation.isPending) {
      setError("Error generating QR");
      setCountdown(4);
    }
  }, [countdown, paymentMutation?.isPending]);


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

  // Initialize countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Initialize payment when component mounts
  useEffect(() => {
    console.log('Initializing payment...');
    paymentMutation.mutate();
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
    if (!isConnected) {
      Alert.alert('Error', 'No UART connection available');
      return;
    }
    let hexStringArray = createMotorRunCmdsWithArray(hexStringArr);
    console.log('Sending hex string array:', hexStringArray);
    
    try {
      // Create a promise that will resolve when all messages are sent
      const sendAllMessages = async () => {
        for (let i = 0; i < hexStringArray.length; i++) {
          const hexString = hexStringArray[i];
          
          // Remove any non-hex characters and make uppercase
          const clean = hexString.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
          
          // Ensure even number of characters
          const even = clean.length % 2 === 0 ? clean : '0' + clean;
          
          // Split into two-character chunks and join with spaces
          let message = even.match(/.{1,2}/g)?.join(' ') ?? '';
          console.log(`Sending message ${i + 1}/${hexStringArray.length}:`, message);
          
          // Add initial delay before sending
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const sendResult = await sendMessage(message);
          if (!sendResult) {
            console.error(`Failed to send message ${i + 1}`);
            return false;
          }
          
          // Wait between commands
          if (i < hexStringArray.length - 1) {
            console.log(`Waiting 5 seconds before next command...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        console.log("All commands sent successfully");
        return true;
      };

      // Start sending messages and don't wait for it to complete
      sendAllMessages().then(success => {
        if (success) {
          console.log("All messages sent successfully");
        } else {
          console.error("Failed to send all messages");
        }
      });

      // Return true immediately to allow navigation
      return true;
    } catch (error) {
      console.error('Error in sendDataArray3:', error);
      return false;
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
              {payDetails?.nepalPayDetails && (
                <TouchableOpacity
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: '#e2e8f0',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => setRoute('nepalUart')}>
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
                    borderWidth: 2,
                    borderColor: '#f97316',
                    backgroundColor: '#fff7ed',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => setRoute('foneUart')}>
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

          {error ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorContent}>
                <AlertCircle size={48} color="#dc2626" style={{alignSelf: 'center', marginBottom: 8}} />
                <Text style={styles.errorTitle}>QR Generation Failed</Text>
                <Text style={styles.errorMessage}>{error}</Text>
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

export default Checkout;
