import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function Review() {
  const [response, setResponse] = useState(null);

  return (
    <View style={styles.container}>
      {response === null ? (
        <>
          <Text style={styles.question}>Did you enjoy using the app? 😊</Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.button} onPress={() => setResponse('yes')}>
              <Text style={styles.buttonText}>👍 Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setResponse('no')}>
              <Text style={styles.buttonText}>👎 No</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text style={styles.thankYou}>
          {response === 'yes'
            ? '🎉 Thanks for your feedback!'
            : '😞 Sorry to hear that. We’ll try to do better!'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  question: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttons: {
    flexDirection: 'row',
    gap: 20,
  },
  button: {
    backgroundColor: '#ffcc80',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 3,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#4e342e',
  },
  thankYou: {
    fontSize: 20,
    textAlign: 'center',
    color: '#6a1b9a',
    paddingHorizontal: 20,
  },
});
