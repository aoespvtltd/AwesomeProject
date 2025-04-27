import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Button, Text, Title, Card, Paragraph } from 'react-native-paper';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import LoadingComp from '../../../components/myComp/LoadingComp';
import { initiatePayment, finalizePayment, clearCart, getCartItems } from '../../../components/api/api';

const Checkout = ({route, setRoute}) => {
  const [qrCodeData, setQrCodeData] = useState('');
  const [orderId, setOrderId] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [isScanned, setIsScanned] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [countdownText, setCountdownText] = useState("Time remaining");
  const [countdown, setCountdown] = useState(120);

  const paymentMutation = useMutation({
    mutationFn: initiatePayment,
    onSuccess: async (response) => {
      const data = response.data.data;

      setOrderId(data.prn);
      setWsUrl(data.wsUrl);

      if (data.qrMessage) {
        setQrCodeData(data.qrMessage);
        
        const ws = new WebSocket(data.wsUrl);
        
        ws.onmessage = async (event) => {
          const jsonData = JSON.parse(event.data);
          console.log("Received WebSocket message:", jsonData);
          
          if (jsonData.transactionStatus) {
            const status = JSON.parse(jsonData.transactionStatus);
            console.log("Parsed transaction status:", status);
        
            if (status.qrVerified) {
              setIsScanned(true);
              console.log("QR code has been scanned.");
            }
            
            console.log(status.paymentSuccess);
        
            if (status.paymentSuccess) {
              console.log("Payment is successful.");
              setPaymentSuccess(true);
      
              await finalizePayment().then((res) => {
                console.log("Payment finalized successfully", res);
                setPaymentSuccess(true);
                setCountdownText("Returning to home in")
                // send the data through serial port here.
                setCountdown(5)
                setTimeout(async () => {
                  setRoute("home");
                }, 5000);
              }).catch((error) => {
                console.error("Error finalizing payment:", error);
              });
            } else {
              console.log("Payment was not successful.");
            }
          } else {
            console.log("QR code scanned without payment information.");
            setIsScanned(true);
          }
        };
        
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
          console.log("WebSocket connection closed");
        };

      } else {
        console.error("QR message is not available.");
        alert("QR message is not available.");
      }
    },
    onError: (error) => {
      console.error("Error initiating payment:", error.message);
      alert("Error initiating payment.");
    },
  });

  const {
    data: cartItems,
    isLoading: cartLoading,
    error: cartError,
    refetch: cartRefetch
  } = useQuery({ 
    queryKey: ["cartItems"],
    queryFn: async () => {
      const machineId = "66d80057da82f664156f58b0";
      return getCartItems(machineId);
    }
  });

  useEffect(() => {
    paymentMutation.mutate();
    
    const interval = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    
    const timeout = setTimeout(async () => {
      await clearCart();
      setRoute("home");
    }, 120000);
  
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <View style={styles.header}>
            <Button
              icon={() => <ArrowLeft color="#000" size={24} />}
              mode="elevated"
              onPress={() => setRoute("carts")}
              style={styles.headerButton}
            >
              Back
            </Button>
            <Button
              mode="contained"
              onPress={() => setRoute("home")}
              style={[styles.headerButton, {backgroundColor: "#f97316"}]}
            >
              Home
            </Button>
          </View>

          <Title style={styles.orderId}>Order Id: {orderId || 'Loading...'}</Title>

          <Paragraph style={styles.text}>We Accept</Paragraph>
          <Image
            style={styles.paymentLogo}
            source={{ uri: "https://login.fonepay.com/assets/img/fonepay_payments_fatafat.png" }}
            resizeMode="contain"
          />

          <Title style={styles.amount}>
            Nrs. {paymentMutation?.data?.data?.data?.amount}
          </Title>

          <Text style={styles.countdown}>
            {countdownText}: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
          </Text>

          {paymentSuccess ? (
            <View style={styles.successMessage}>
              <Text style={styles.successText}>Payment Successful!</Text>
              <Text>Thank you for the purchase!</Text>
              <Text>Have a good day.</Text>
              <Text>Returning to home in {countdown} seconds.</Text>
            </View>
          ) : isScanned ? (
            <View style={styles.scannedMessage}>
              <Text style={styles.scannedText}>QR Code Scanned! Processing payment...</Text>
              <QRCode value={qrCodeData} size={200} />
            </View>
          ) : qrCodeData ? (
            <View style={styles.qrContainer}>
              <Text style={styles.qrText}>Scan the QR to pay.</Text>
              <Text style={styles.qrText}>Dispense will start automatically after successful payment.</Text>
              <QRCode value={qrCodeData} size={200} />
            </View>
          ) : (
            <LoadingComp />
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,  // Add horizontal padding for overall spacing
  },
  card: {
    width: '100%',  // Increase width to take full available space
    maxWidth: 600, // Limit to a maximum width to avoid it being too wide on large screens
    padding: 20,  // Increased padding for better spacing
    borderRadius: 12,
    elevation: 8,  // Adding some elevation to make the card stand out
    alignItems: 'center',  // Ensures all content inside the card is centered
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  headerButton: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center', // Centering buttons within the header
  },
  orderId: {
    color: '#f97316',
    marginVertical: 10,
    fontSize: 18,
    textAlign: 'center',  // Ensures the Order ID is centered
  },
  text: {
    color: '#555',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',  // Centers the text
  },
  paymentLogo: {
    height: 48,
    width: '100%',
    marginVertical: 10,
    alignSelf: 'center',
  },
  amount: {
    color: '#f97316',
    fontSize: 24,
    marginVertical: 10,
    fontWeight: 'bold',
    textAlign: 'center',  // Centers the amount text
  },
  countdown: {
    color: 'red',
    fontSize: 18,
    marginVertical: 10,
    textAlign: 'center',  // Centers the countdown text
  },
  successMessage: {
    marginTop: 20,
    alignItems: 'center',
  },
  successText: {
    color: 'green',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',  // Ensures text is centered
  },
  scannedMessage: {
    marginTop: 20,
    alignItems: 'center',
  },
  scannedText: {
    color: 'green',
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',  // Centers the scanned text
  },
  qrContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  qrText: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 16,
    color: '#333',
  },
  content: {
    padding: 20,  // Adjusted padding for better spacing
  }
});

export default Checkout;
