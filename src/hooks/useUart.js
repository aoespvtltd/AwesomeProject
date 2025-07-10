import {useState, useEffect, useRef} from 'react';
import {NativeModules, NativeEventEmitter} from 'react-native';
import {Alert} from 'react-native';

const {UartModule} = NativeModules;

// Create a singleton instance to maintain UART state across component unmounts
let uartInstance = {
  isInitialized: false,
  isConnected: false,
  isListening: false,
  eventEmitter: null,
  subscription: null
};

const useUart = () => {
  const [isInitialized, setIsInitialized] = useState(uartInstance.isInitialized);
  const [isConnected, setIsConnected] = useState(uartInstance.isConnected);
  const [isListening, setIsListening] = useState(uartInstance.isListening);
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [helloWorld, setHelloWorld] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    // Only initialize if not already initialized
    if (!uartInstance.isInitialized) {
      initializeUart();
    } else {
      // Update state from singleton
      setIsInitialized(uartInstance.isInitialized);
      setIsConnected(uartInstance.isConnected);
      setIsListening(uartInstance.isListening);
    }

    // Set up event listener if not already set
    if (!uartInstance.eventEmitter) {
      uartInstance.eventEmitter = new NativeEventEmitter(UartModule);
      uartInstance.subscription = uartInstance.eventEmitter.addListener('onDataReceived', handleDataReceived);
    }

    // Get hello world message
    try {
      UartModule.getHelloWorld()
        .then(message => {
          if (isMounted.current) {
            console.log('Received hello world:', message);
            setHelloWorld(message);
          }
        })
        .catch(error => {
          if (isMounted.current) {
            console.error('Failed to get hello world:', error);
            setHelloWorld('Error: ' + error.message);
          }
        });
    } catch (error) {
      console.error('Error calling getHelloWorld:', error);
      if (isMounted.current) {
        setHelloWorld('Error: ' + error.message);
      }
    }

    return () => {
      isMounted.current = false;
      // Don't cleanup UART here, let it persist
    };
  }, []);

  const handleDataReceived = (data) => {
    if (!data || typeof data !== 'string') {
      console.warn('Invalid data received:', data);
      return;
    }

    const cleanedData = data.replace(/[^0-9A-Fa-f\s]/g, '');
    
    if (cleanedData.trim() && isMounted.current) {
      setReceivedMessages(prev => {
        const newMessages = [...prev, cleanedData];
        return newMessages.slice(-50);
      });
    }
  };

  const initializeUart = async () => {
    try {
      const res = await UartModule.initializeUart();
      console.log('initializeUart', res);
      uartInstance.isInitialized = true;
      uartInstance.isConnected = true;
      uartInstance.isListening = true;
      
      if (isMounted.current) {
        setIsInitialized(true);
        setIsConnected(true);
        setIsListening(true);
      }
    } catch (error) {
      console.error('Failed to initialize UART:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to initialize UART communication');
      }
    }
  };

  const cleanupUart = async () => {
    try {
      await UartModule.cleanup();
      uartInstance.isInitialized = false;
      uartInstance.isConnected = false;
      uartInstance.isListening = false;
      
      if (isMounted.current) {
        setIsInitialized(false);
        setIsConnected(false);
        setIsListening(false);
      }
    } catch (error) {
      console.error('Failed to cleanup UART:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await cleanupUart();
      await initializeUart();
      if (isMounted.current) {
        Alert.alert('Success', 'UART connection refreshed successfully');
      }
    } catch (error) {
      console.error('Failed to refresh UART:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to refresh UART connection');
      }
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }
  };

  const clearMessages = () => {
    if (isMounted.current) {
      setReceivedMessages([]);
    }
  };

  const sendMessage = async (message) => {
    if (!message.trim()) {
      if (isMounted.current) {
        Alert.alert('Error', 'Please enter a message to send');
      }
      return false;
    }
    try {  
      await UartModule.sendData(message);
      console.log('Message sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to send message');
      }
      return false;
    }
  };

  const formatHexInput = (text) => {
    const cleaned = text.replace(/[^0-9A-Fa-f]/g, '');
    const formatted = cleaned.match(/.{1,2}/g)?.join(' ') || '';
    return formatted.toUpperCase();
  };

  return {
    isInitialized,
    isConnected,
    isListening,
    receivedMessages,
    isRefreshing,
    helloWorld,
    handleRefresh,
    clearMessages,
    sendMessage,
    formatHexInput
  };
};

export default useUart; 