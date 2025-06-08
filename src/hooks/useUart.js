import {useState, useEffect} from 'react';
import {NativeModules, NativeEventEmitter} from 'react-native';
import {Alert} from 'react-native';

const {UartModule} = NativeModules;

const useUart = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [helloWorld, setHelloWorld] = useState('');

  useEffect(() => {
    initializeUart();
    const eventEmitter = new NativeEventEmitter(UartModule);
    const subscription = eventEmitter.addListener('onDataReceived', handleDataReceived);

    // Get hello world message
    try {
      UartModule.getHelloWorld()
        .then(message => {
          console.log('Received hello world:', message);
          setHelloWorld(message);
        })
        .catch(error => {
          console.error('Failed to get hello world:', error);
          setHelloWorld('Error: ' + error.message);
        });
    } catch (error) {
      console.error('Error calling getHelloWorld:', error);
      setHelloWorld('Error: ' + error.message);
    }

    return () => {
      cleanupUart();
      subscription.remove();
    };
  }, []);

  const handleDataReceived = (data) => {
    if (!data || typeof data !== 'string') {
      console.warn('Invalid data received:', data);
      return;
    }

    const cleanedData = data.replace(/[^0-9A-Fa-f\s]/g, '');
    
    if (cleanedData.trim()) {
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
      setIsInitialized(true);
      setIsConnected(true);
      setIsListening(true);
    } catch (error) {
      console.error('Failed to initialize UART:', error);
      Alert.alert('Error', 'Failed to initialize UART communication');
    }
  };

  const cleanupUart = async () => {
    try {
      await UartModule.cleanup();
      setIsInitialized(false);
      setIsConnected(false);
      setIsListening(false);
    } catch (error) {
      console.error('Failed to cleanup UART:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await cleanupUart();
      await initializeUart();
      Alert.alert('Success', 'UART connection refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh UART:', error);
      Alert.alert('Error', 'Failed to refresh UART connection');
    } finally {
      setIsRefreshing(false);
    }
  };

  const clearMessages = () => {
    setReceivedMessages([]);
  };

  const sendMessage = async (message) => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message to send');
      return;
    }
    try {  
      await UartModule.sendData(message);
      console.log('Message sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message');
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