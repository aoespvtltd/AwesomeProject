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
  getUnpaidCartsByMachine,
  hasWhatPayments,
} from '../../components/api/api';
import {generateCommand} from '../utils/generatorFn';
import {createMotorRunCmdsWithArray} from '../utils/serialDetail';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useUart from '../hooks/useUart';

const Checkout = ({route, setRoute}) => {
  const [countdownText, setCountdownText] = useState('Time remaining');
  const [countdown, setCountdown] = useState(120);

  async function asy(){ 
    console.log(await AsyncStorage.getAllKeys()) 
    return await AsyncStorage.getItem("fonepayDetails")
  } 

useEffect(() => {
// console.log(payDetails)  
console.log(payDetails?.merchantDetails, payDetails?.nepalPayDetails)   
}, [])


  const {
    data: payDetails, 
    isLoading: payIsLoading,
    error: payError,
  } = useQuery({
    queryKey: ['payDetails'],
    queryFn: async () => {
      let foneDetails = await asy();
      let parsedDetails = null;
      if (foneDetails) {
        try {
          parsedDetails = JSON.parse(foneDetails);
        } catch (e) {
          // Corrupted cache, ignore and fetch fresh
          parsedDetails = null;
        }
      }

      // Validate that both details exist
      if (
        parsedDetails &&
        parsedDetails.merchantDetails &&
        parsedDetails.nepalPayDetails
      ) {
        return parsedDetails;
      }

      // Fetch fresh from API
      const res = await hasWhatPayments();
      if (
        res.data?.data &&
        res.data.data.merchantDetails &&
        res.data.data.nepalPayDetails
      ) {
        await AsyncStorage.setItem("fonepayDetails", JSON.stringify(res.data.data));
        return res.data.data;
      } else {
        // Optionally clear cache if API returns incomplete data
        await AsyncStorage.removeItem("fonepayDetails");
        throw new Error("Payment details incomplete from API");
      }
    },
  });

  const {
    data: cartItems,
    isLoading: cartLoading,
    error: cartError,
    refetch: cartRefetch,
  } = useQuery({
    queryKey: ['cartData'],
    queryFn: async () => {
      let cartData = await getUnpaidCartsByMachine();
      return cartData;
    },
  });

  // Calculate total from cartItems
  const totalAmount = cartItems?.data?.data?.reduce((sum, item) => sum + (item.productId.price * item.quantity), 0) || 0;

  // Initialize countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);




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
      <View style={styles.paymentSection}>
        <View style={styles.contentContainer}>
          <View style={styles.sideBySideContainer}>
            {/* Payment Buttons - independently scrollable and vertically centered */}
            <ScrollView style={styles.paymentButtonsScroll} contentContainerStyle={styles.paymentButtonsContent}>
              <Text style={styles.paymentText}>Choose your payment option</Text>
              <View style={{flexDirection: 'column', gap: 12}}>
                {/* {payDetails?.nepalPayDetails && ( */}
                  <TouchableOpacity
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: '#e2e8f0',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => setRoute('nepalUart')}
                    disabled={!payDetails?.nepalPayDetails}
                    >
                      {console.log(payDetails?.nepalPayDetails)}
                    <Image
                      style={{width: 120, height: 50}}
                      source={require("../assets/nepalPayLogo.png")}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                {/* )} */}
                {/* {payDetails?.merchantDetails && ( */}
                  <TouchableOpacity
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: '#e2e8f0',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => setRoute('foneUart')}
                    disabled={!payDetails?.merchantDetails}
                    >
                      {console.log(payDetails?.merchantDetails)}
                    <Image
                      style={{width: 120, height: 50}}
                      source={require("../assets/fonePay.png")}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                {/* // )} */}
              </View>
            </ScrollView>

            {/* QR/Feedback Section - independently scrollable */}
            <ScrollView style={styles.qrSectionScroll} contentContainerStyle={styles.qrSectionContent}>
              <View style={styles.messageContainer}>
                <Text style={styles.instructionText}>Scan the QR to pay</Text>
                <Text style={styles.subInstructionText}>
                  Dispense will start automatically after successful payment
                </Text>
                <Text style={styles.amount}>
                  Nrs. {totalAmount}
                </Text>
                <View style={styles.qrCodeContainer} />
              </View>
            </ScrollView>
          </View>
        </View>
      </View>

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
    height: '100%',
    // backgroundColor: "green",
  },
  contentContainer: {
    padding: 16,
    alignItems: 'center',
    flexDirection: "row",
    height: "100%",
    justifyContent: "center",
  },
  sideBySideContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: "100%",
    gap: 0,
  },
  paymentButtonsScroll: {
    flex: 1,
    minWidth: 180,
    maxWidth: 260,
    height: '100%',
  },
  paymentButtonsContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    // backgroundColor: "green",
  },
  qrSectionScroll: {
    flex: 2,
    minWidth: 160,
    height: '100%',
    // backgroundColor: "red",
  },
  qrSectionContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: "flex-start",
    paddingVertical: 24,
  },
  paymentButtonsContainer: {
    flex: 1,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  qrSectionContainer: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 250,
  },
  paymentText: {
    fontSize: 22,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#2f2f2f',
    marginBottom: 16,
    marginHorizontal: 36,
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
    paddingVertical: 10,
    paddingRight: 10,
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
    padding: 100,
    backgroundColor: "#ddd",
    borderRadius: 8,
    // elevation: 3,
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
