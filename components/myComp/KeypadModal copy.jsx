import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Button, TextInput, Title } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Delete } from 'lucide-react-native';
import { ActionSheet } from 'react-native-ui-lib';
import { addToCartByPN, clearCart } from '../api/api';

function KeypadModal({ visible, onClose, inputValue, onInputChange, productLength, qty }) {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const handleButtonClick = useCallback((number) => {
    if (number === '') return;
    onInputChange(inputValue + number);
  }, [inputValue, onInputChange]);

  const handleDelete = useCallback(() => {
    onInputChange(inputValue.slice(0, -1));
  }, [inputValue, onInputChange]);

  const buyByProductNumber = useCallback(async () => {
    try {
      const clearCartResponse = await clearCart();
      console.log(clearCartResponse);

      const addToCartResponse = await addToCartByPN(parseInt(inputValue));
      console.log(addToCartResponse);

      navigation.navigate('Checkout');
    } catch (error) {
      console.error('Error during purchase process:', error);
    }
  }, [inputValue, navigation]);

  const handleStockButtonPress = useCallback(async () => {
    const machineId = await AsyncStorage.getItem("machineId");
    navigation.navigate('AdminFillStock', { machineId });
  }, [navigation]);

  return (
    <ActionSheet
      visible={visible}
      onDismiss={onClose}
      containerStyle={styles.actionSheet}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Title>Keypad</Title>
        </View>
        <TextInput
          value={inputValue}
          editable={false}
          style={styles.input}
        />
        <View style={styles.keypadContainer}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0].map((num) =>
            num !== '' ? (
              <TouchableOpacity
                key={num}
                style={styles.keypadButton}
                onPress={() => handleButtonClick(num.toString())}
              >
                <Title>{num}</Title>
              </TouchableOpacity>
            ) : 
              inputValue === "9876543210" ? (
                <TouchableOpacity
                  key={"buttonKey"}
                  style={[styles.keypadButton, styles.stockButton]}
                  onPress={handleStockButtonPress}
                >
                  <Title>Stock</Title>
                </TouchableOpacity>
              ) : <View key={num} style={styles.invisibleButton} />
          )}
          <TouchableOpacity
            style={[styles.keypadButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Delete color="white" />
          </TouchableOpacity>
        </View>
        <Button
          mode="contained"
          onPress={buyByProductNumber}
          disabled={productLength !== 1 || qty === 0}
          style={[
            styles.buyButton,
            { backgroundColor: productLength === 1 ? '#f97316' : '#9ca3af' }
          ]}
        >
          Buy Now
        </Button>
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  actionSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    width: '100%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 20,
  },
  keypadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  keypadButton: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    margin: 5,
  },
  invisibleButton: {
    width: '30%',
    aspectRatio: 1,
    margin: 5,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  stockButton: {
    backgroundColor: '#22c55e',
  },
  buyButton: {
    marginTop: 10,
  },
});

export default KeypadModal;