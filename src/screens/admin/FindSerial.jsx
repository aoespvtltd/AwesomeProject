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
import {
  UsbSerialManager,
  Parity,
} from 'react-native-usb-serialport-for-android';
import {createMotorRunCmdsWithArray} from '../../utils/serialDetail';
import {RefreshCcw, StepBack} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMachineDetails } from '../../../components/api/api';

const FindSerial = ({setRoute}) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [baudRate, setBaudRate] = useState('9600');
  const [isConnected, setIsConnected] = useState(false);
  const [serialPort, setSerialPort] = useState(null);
  const [testCommand, setTestCommand] = useState(0);
  const [running, setRunning] = useState(null);
  const [numTestItems, setNumTestItems] = useState(5);
  const [machine, setMachine] = useState()

  // Common baud rates
  const baudRates = ['9600', '115200'];

  // Convert string to hex for serial communication
  function stringToHex(str) {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i).toString(16).padStart(2, '0');
      hex += charCode;
    }
    return hex;
  }

  const getMapArray = async ()=>{
    const machineId = await AsyncStorage.getItem("machineId")
    const thisMachine = await getMachineDetails(machineId)  
    setMachine(thisMachine?.data?.data)
    return thisMachine?.data?.data
  }

  // Test serial communication
  const testConnection = async () => {
    if (!serialPort || !isConnected) {
      Alert.alert('Error', 'Please connect to a device first');
      return;
    }

    try {
      // Test command - you can modify this based on your needs
      const testCommand = [[1, 2]];
      const hexData = stringToHex(testCommand);

      await serialPort.send(hexData);
      console.log(`Sent test data: ${hexData}`);
      Alert.alert('Success', 'Test command sent successfully');
    } catch (error) {
      console.error('Error sending test command:', error);
      Alert.alert('Error', 'Failed to send test command');
    }
  };

  async function sendDataArray3(hexStringArr) {
    let thisMachine = await getMapArray()
    const mappingArray = machine.configArray
    const mappedArray = hexStringArr.map(msg=>{
      return [
      thisMachine?.configArray[msg[0]-1], msg[1]
    ]})
    console.log(mappedArray, mappingArray)
    let hexStringArray = createMotorRunCmdsWithArray(mappedArray);
    // console.log(hexStringArray)
    if (!serialPort) {
      Alert.alert('Error', 'No serial connection available');
      return;
    }


    try {
      for (let i = 0; i < hexStringArray.length; i++) {
        // Send current hex string
        const hexString = hexStringArray[i];
        console.log(i+1);
        setRunning(hexString);
        console.log(
          `Sending string ${i + 1}/${hexStringArray.length}: ${hexString}`,
        );
        await serialPort.send(hexString);

        let timeoutTime = 5000;
        // if (hexStringArr[i][0] <= 10) {
        //   timeoutTime = 5000;
        // } else {
        //   timeoutTime = 10000;
        // }

        // Don't wait after the last string
        if (i < hexStringArray.length - 1) {
          // Wait for 3 seconds before sending next string
          await new Promise(resolve => setTimeout(resolve, timeoutTime));
        }
      }
    } catch (error) {
      console.error('Error sending data:', error);
    }
  }

  // List all available devices
  const listDevices = async () => {
    try {
      const availableDevices = await UsbSerialManager.list();
      setDevices(availableDevices);
      // Alert.alert(availableDevices)
      console.log('Available devices:', availableDevices);
    } catch (error) {
      console.error('Error listing devices:', error);
      Alert.alert('Error', 'Failed to list USB devices');
    }
  };

  // Connect to selected device
  const connectDevice = async () => {
    if (!selectedDevice) {
      Alert.alert('Error', 'Please select a device first');
      return;
    }

    try {
      // Request permission
      const granted = await UsbSerialManager.tryRequestPermission(
        selectedDevice.deviceId,
      );

      if (granted) {
        // Open serial port with selected configuration
        const port = await UsbSerialManager.open(selectedDevice.deviceId, {
          baudRate: parseInt(baudRate),
          parity: Parity.None,
          dataBits: 8,
          stopBits: 1,
        });

        setSerialPort(port);
        setIsConnected(true);
        Alert.alert('Success', 'Connected to device successfully');
      } else {
        Alert.alert('Error', 'USB permission denied');
      }
    } catch (error) {
      console.error('Error connecting to device:', error);
      Alert.alert('Error', 'Failed to connect to device');
    }
  };

  // Refresh device list
  useEffect(() => {
    listDevices();
    getMapArray()
    return () => {
      // Cleanup: close serial port when component unmounts
      if (serialPort) {
        serialPort.close();
      }
    };
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
            onPress={listDevices}
            style={styles.refreshButton}>
            Refresh Devices
          </Button>

          {/* Device List */}
          <ScrollView style={styles.deviceList}>
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
          </ScrollView>

          {/* Baud Rate Selection */}
          <Title style={styles.sectionTitle}>Baud Rate</Title>
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
            {/* <TextInput
              label="Custom Baud Rate"
              value={!baudRates.includes(baudRate) ? baudRate : ''}
              onChangeText={setBaudRate}
              keyboardType="numeric"
              style={styles.customBaudInput}
            /> */}
          </View>

          {/* Connect Button */}
          <Button
            mode="contained"
            onPress={connectDevice}
            // disabled={!selectedDevice || isConnected}
            style={styles.connectButton}>
            {isConnected ? 'Connected' : 'Connect'}
          </Button>

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
                testCommand + i,
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
