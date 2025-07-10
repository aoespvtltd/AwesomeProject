import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView, Alert,
  TextInput,
  TouchableOpacity} from 'react-native';
import {
  Button,
  Text,
  Card,
  Title,
  RadioButton,
} from 'react-native-paper';
import {createMotorRunCmdsWithArray} from '../../utils/serialDetail';
import {RefreshCcw, StepBack} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMachineDetails } from '../../../components/api/api';
import useUart from '../../hooks/useUart';

const FindSerial = ({setRoute}) => {
  const [testCommand, setTestCommand] = useState(0);
  const [running, setRunning] = useState(null);
  const [numTestItems, setNumTestItems] = useState(5);
  const [configArray, setConfigArray] = useState([])

  
  const {
    isConnected,
    sendMessage,
    handleRefresh,
  } = useUart();


  const getMapArray = async ()=>{
    const machineId = await AsyncStorage.getItem("machineId")
    const thisMachine = await getMachineDetails(machineId)
    console.log(thisMachine.data.data.configArray)
    setConfigArray(thisMachine.data.data.configArray)
    // setMachine(thisMachine?.data?.data)
    return thisMachine?.data?.data
  }


  async function sendDataArray3(hexStringArr) {
    console.log(hexStringArr)
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

          setRunning(message)
          
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



  // Refresh device list
  useEffect(() => {
    getMapArray();
  }, []);

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}>
            <StepBack
              size={40}
              color="black"
              onPress={() => setRoute('home')}
            />
            <Title>USB Serial Devices</Title>
            <TouchableOpacity onPress={getMapArray}>
              <RefreshCcw size={16}/>
            </TouchableOpacity>
          </View>

          {/* Refresh Button */}
          <Button 
            mode="contained"
            onPress={handleRefresh}
            style={styles.refreshButton}>
            Refresh Devices
          </Button>

          {/* Device List */}
          {/* <ScrollView style={styles.deviceList}>
            {devices.map((device, index) => (
              <RadioButton.Item
                key={device.deviceId}
                label={`Device ${index + 1}: ${
                  device.deviceName || device.deviceId
                }`}
                value={device.deviceId}
                status={
                  selectedDevice?.deviceId === device.deviceId
                    ? 'checked'
                    : 'unchecked'
                }
                onPress={() => {
                  setSelectedDevice(device);
                  // AsyncStorage.setItem("port", `${device}`)
                  // Alert.alert(device.vendorId)
                }}
              />
            ))}
          </ScrollView> */}

          {/* Baud Rate Selection */}
          {/* <Title style={styles.sectionTitle}>Baud Rate</Title>
          <View style={styles.baudRateContainer}>
            {baudRates.map(rate => (
              <RadioButton.Item
                key={rate}
                label={rate}
                value={rate}
                status={baudRate === rate ? 'checked' : 'unchecked'}
                onPress={() => setBaudRate(rate)}
              />
            ))}
          </View> */}

          {/* Connect Button */}
          {/* <Button
            mode="contained"
            onPress={connectDevice}
            // disabled={!selectedDevice || isConnected}
            style={styles.connectButton}>
            {isConnected ? 'Connected' : 'Connect'}
          </Button> */}

          {/* Test Button */}
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 12,
              justifyContent: 'space-between',
            }}>
            <TextInput
              label="Test Command"
              value={testCommand.toString()}
              onChangeText={text => {
                if (text === '') {
                  setTestCommand(0);
                } else {
                  const num = parseInt(text);
                  if (!isNaN(num)) {
                    setTestCommand(num);
                  }
                }
              }}
              keyboardType="numeric"
              style={styles.customBaudInput}
            />
            <TextInput
              label="Number of Test Items"
              value={numTestItems.toString()}
              onChangeText={text => {
                if (text === '') {
                  setNumTestItems(0);
                } else {
                  const num = parseInt(text);
                  if (!isNaN(num)) {
                    setNumTestItems(Math.max(0, num));
                  }
                }
              }}
              keyboardType="numeric"
              style={styles.customBaudInput}
            />
          </View>
          <Button
            mode="contained"
            onPress={() => {
              const testArray = Array.from({length: numTestItems}, (_, i) => [
                configArray[(testCommand + i - 1)],
                1,
              ]);
              sendDataArray3(testArray);
            }}
            style={styles.testButton}
            >
            Test Connection
          </Button>
          <Text>
            {/* {AsyncStorage.getItem("port")} */}
            {running || '0'}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    elevation: 4,
  },
  refreshButton: {
    marginVertical: 16,
    backgroundColor: '#f97316',
  },
  deviceList: {
    maxHeight: 200,
    marginVertical: 8,
  },
  sectionTitle: {
    marginTop: 16,
    fontSize: 18,
  },
  baudRateContainer: {
    marginVertical: 8,
  },
  customBaudInput: {
    marginTop: 8,
    width: '45%',
  },
  connectButton: {
    marginTop: 16,
    backgroundColor: '#22c55e',
  },
  testButton: {
    marginTop: 8,
    backgroundColor: '#3b82f6',
  },
});

export default FindSerial;
