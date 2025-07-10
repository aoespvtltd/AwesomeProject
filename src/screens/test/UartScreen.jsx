import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {Text, Button, TextInput, Card} from 'react-native-paper';
import {ArrowLeft, RefreshCw, Trash2} from 'lucide-react-native';
import useUart from '../../hooks/useUart';

const UartScreen = ({setRoute}) => {
  const [message, setMessage] = useState('');
  const {
    isConnected,
    isRefreshing,
    helloWorld,
    receivedMessages,
    handleRefresh,
    clearMessages,
    sendMessage,
    formatHexInput
  } = useUart();

  const handleSendMessage = async () => {
    const success = await sendMessage(message);
    if (success) {
      setMessage('');
    }
  };

  const handleFormatInput = (text) => {
    const formatted = formatHexInput(text);
    setMessage(formatted);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setRoute('home')}
          style={styles.backButton}>
          <ArrowLeft color="#000" size={24} />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>UART Communication</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={[styles.refreshButton, isRefreshing && styles.refreshingButton]}
          disabled={isRefreshing}>
          <RefreshCw color="#000" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Hello World Message */}
        <Card style={styles.statusCard}>
          <Card.Content>
            <Text style={styles.statusTitle}>Native Message</Text>
            <Text style={styles.helloWorld}>{helloWorld}</Text>
          </Card.Content>
        </Card>

        {/* Connection Status */}
        <Card style={styles.statusCard}>
          <Card.Content>
            <Text style={styles.statusTitle}>Connection Status</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusIndicator,
                  {backgroundColor: isConnected ? '#22c55e' : '#ef4444'},
                ]}
              />
              <Text style={styles.statusText}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Message Input */}
        <Card style={styles.inputCard}>
          <Card.Content>
            <Text style={styles.inputTitle}>Send Message</Text>
            <TextInput
              mode="outlined"
              label="Hex Values (space-separated)"
              value={message}
              onChangeText={handleFormatInput}
              placeholder="FF 00 1A"
              style={styles.input}
              disabled={!isConnected}
            />
            <Button
              mode="contained"
              onPress={handleSendMessage}
              style={styles.sendButton}
              disabled={!isConnected}>
              Send Message
            </Button>
          </Card.Content>
        </Card>

        {/* Message Log */}
        <Card style={styles.logCard}>
          <Card.Content>
            <View style={styles.logHeader}>
              <Text style={styles.logTitle}>Message Log</Text>
              <TouchableOpacity onPress={clearMessages} style={styles.clearButton}>
                <Trash2 color="#666" size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.logContent}>
              {receivedMessages.map((msg, index) => (
                <Text key={index} style={styles.logMessage}>
                  {typeof msg === 'object' ? JSON.stringify(msg) : msg}
                </Text>
              ))}
            </ScrollView>
          </Card.Content>
        </Card>

        {/* Instructions */}
        <Card style={styles.instructionsCard}>
          <Card.Content>
            <Text style={styles.instructionsTitle}>Instructions</Text>
            <Text style={styles.instructionText}>
              • Enter hex values separated by spaces
            </Text>
            <Text style={styles.instructionText}>
              • Example: FF 00 1A
            </Text>
            <Text style={styles.instructionText}>
              • Only valid hex values (0-9, A-F) are accepted
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    flex: 1,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  refreshingButton: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
  },
  inputCard: {
    marginBottom: 16,
  },
  inputTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#f97316',
  },
  logCard: {
    marginBottom: 16,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    padding: 4,
  },
  logContent: {
    maxHeight: 200,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 8,
  },
  logMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  instructionsCard: {
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  helloWorld: {
    fontSize: 18,
    color: '#333',
    marginVertical: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    textAlign: 'center',
  },
});

export default UartScreen; 