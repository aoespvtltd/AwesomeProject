import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Delete, X } from 'lucide-react-native';
import { addToCartByPN, clearCart, machineId as mId } from '../api/api';
import { useQueryClient } from '@tanstack/react-query';

function KeypadModal({ inputValue, onInputChange, onClose, visible, productLength, qty, setRoute }) {
  const queryClient = useQueryClient();
  const machineId = mId;

  const handleButtonClick = (number) => {
    if (number === '') return;
    onInputChange(inputValue + number);
  };

  const handleDelete = () => {
    onInputChange(inputValue.slice(0, -1));
  };

  const buyByProductNumber = async () => {
    await clearCart().then(async (res) => {
      await addToCartByPN(parseInt(inputValue)).then((addRes) => {
        setRoute("checkout");
      }).catch((error) => console.log(error));
    }).catch((error) => console.log(error));
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      {/* Allow Interaction with Background */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlayContainer} />
      </TouchableWithoutFeedback>
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Keypad</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color="red" size={40} />
          </TouchableOpacity>
        </View>

        {/* Input Bar */}
        <TextInput value={inputValue} editable={false} style={styles.inputBar} />

        {/* Keypad Grid */}
        <View style={styles.keypadContainer}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0].map((num, index) =>
            num !== '' ? (
              <TouchableOpacity
                key={index}
                style={styles.keyButton}
                onPress={() => handleButtonClick(num.toString())}
              >
                <Text style={styles.keyButtonText}>{num}</Text>
              </TouchableOpacity>
            ) : inputValue === '9876543210' ? (
              <TouchableOpacity
                key={index}
                onPress={()=>setRoute("fillstock")}
                style={[styles.keyButton, styles.stockButton]}
              >
                <Text style={styles.keyButtonText}>Stock</Text>
              </TouchableOpacity>
            ) : (
              <View key={index} style={styles.emptyButton} />
            )
          )}

          <TouchableOpacity style={[styles.keyButton, styles.deleteButton]} onPress={handleDelete}>
            <Delete color="white" size={30} />
          </TouchableOpacity>
        </View>

        {/* Buy Now Button */}
        <TouchableOpacity
          style={[
            styles.buyNowButton,
            productLength === 1 ? styles.buyNowActive : styles.buyNowDisabled,
          ]}
          onPress={buyByProductNumber}
          disabled={productLength !== 1 && qty !== 0}
        >
          <Text style={styles.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 16,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    width: '90%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  inputBar: {
    borderWidth: 1,
    width: '90%',
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
  },
  keypadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    maxWidth: 380,
  },
  keyButton: {
    width: 80,
    height: 80,
    margin: 8,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007bff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    transform: [{ scale: 1 }],
    transition: 'transform 0.3s ease',
  },
  keyButtonText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  stockButton: {
    backgroundColor: '#28a745',
  },
  emptyButton: {
    width: 80,
    height: 80,
    margin: 8,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  buyNowButton: {
    paddingVertical: 16,
    width: '90%',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    elevation: 6,
  },
  buyNowActive: {
    backgroundColor: '#f97316',
  },
  buyNowDisabled: {
    backgroundColor: '#ccc',
  },
  buyNowText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default KeypadModal;
