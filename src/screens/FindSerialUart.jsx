import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import DebounceTouchableOpacity from '../../components/myComp/DebounceTouchableOpacity';
import useUart from '../hooks/useUart';

const FindSerialUart = ({ setRoute }) => {
  const { isConnected, sendMessage, handleRefresh } = useUart();
  const [startProduct, setStartProduct] = useState('');
  const [numMotors, setNumMotors] = useState('');
  const [result, setResult] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setConnecting(true);
      handleRefresh().finally(() => setConnecting(false));
    }
    // Optionally disconnect on unmount
    // return () => disconnect();
  }, [isConnected]);


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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <DebounceTouchableOpacity onPress={() => setRoute('home')} style={styles.backButton}>
          <ArrowLeft size={24} color="black" />
        </DebounceTouchableOpacity>
        <Text style={styles.title}>Find Serial (UART)</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.statusRow}>
        <Text style={{ color: isConnected ? 'green' : 'red', fontWeight: 'bold' }}>
          UART Status: {isConnected ? 'Connected' : connecting ? 'Connecting...' : 'Not Connected'}
        </Text>
      </View>
      <View style={styles.inputRow}>
        <Text style={styles.label}>Starting Product Number:</Text>
        <TextInput
          style={styles.input}
          value={startProduct}
          onChangeText={setStartProduct}
          keyboardType="numeric"
          placeholder="e.g. 1"
        />
      </View>
      <View style={styles.inputRow}>
        <Text style={styles.label}>Number of Motors to Run:</Text>
        <TextInput
          style={styles.input}
          value={numMotors}
          onChangeText={setNumMotors}
          keyboardType="numeric"
          placeholder="e.g. 10"
        />
      </View>
      <View style={styles.buttonRow}>
        <Button title="Run Motors" 
            onPress={() => {
              const testArray = Array.from({length: numTestItems}, (_, i) => [
                testCommand + i,
                1,
              ]);
              sendDataArray3(testArray);
            }} />
      </View>
      {result ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    elevation: 2,
    gap: 12,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  statusRow: {
    marginBottom: 24,
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    width: 180,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    marginLeft: 8,
  },
  buttonRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  resultBox: {
    marginTop: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
  },
  resultText: {
    fontSize: 16,
    color: '#333',
  },
});

export default FindSerialUart; 