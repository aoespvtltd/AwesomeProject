import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import init from 'react_native_mqtt';

let client;

export default function MqttReceiverScreen() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  const topic = 'Store1/66d72290ee1e0a2dabce6069/payment';

  useEffect(() => {
    // Initialize MQTT
    init({
      size: 10000,
      storageBackend: AsyncStorage,
      defaultExpires: 1000 * 3600 * 24,
      enableCache: true,
      reconnect: true,
      sync: {},
    });

    client = new Paho.MQTT.Client(
      'mqtt.eclipseprojects.io',
      443,
      `client-${Math.random().toString(16).substr(2, 8)}`
    );

    client.onConnectionLost = (responseObject) => {
      if (responseObject.errorCode !== 0) {
        console.log('🔌 Connection lost:', responseObject.errorMessage);
        setConnected(false);
      }
    };

    client.onMessageArrived = (message) => {
      console.log('📩 Message:', message.payloadString);
      setMessages((prev) => [...prev, message.payloadString]);
    };

    client.connect({
      onSuccess: () => {
        console.log('✅ Connected to MQTT broker');
        setConnected(true);
        client.subscribe(topic);
      },
      useSSL: true,
      onFailure: (err) => {
        console.error('❌ Connection failed:', err);
      },
    });

    return () => {
      if (client && connected) {
        client.disconnect();
        console.log('🔌 Disconnected');
      }
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>MQTT Receiver</Text>
      <Text style={styles.status}>
        Status: {connected ? 'Connected ✅' : 'Disconnected ❌'}
      </Text>

      <View style={styles.messages}>
        {messages.map((msg, index) => (
          <Text key={index} style={styles.messageText}>
            • {msg}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
  },
  messages: {
    marginTop: 10,
    backgroundColor: '#f2f2f2',
    padding: 10,
    borderRadius: 6,
  },
  messageText: {
    fontSize: 15,
    marginBottom: 5,
  },
});
