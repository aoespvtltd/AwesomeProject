import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, Dimensions, TouchableWithoutFeedback } from 'react-native';
import DebouncedTouchableOpacity from './DebounceTouchableOpacity';

const { height: windowHeight } = Dimensions.get('window');

export default function CustomDialog({
  visible,
  onClose,
  icon,
  title,
  description,
  cancelText = "Cancel",
  confirmText = "OK",
  onConfirm,
  confirmButtonColor = "#ff6600",
  confirmTextColor = "#fff",
  cancelButtonColor = "#f0f0f0",
  cancelTextColor = "#333",
  scrollMaxHeight = windowHeight * 0.32, // You can adjust this
}) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* <TouchableWithoutFeedback> */}
          <View style={styles.contentWrapper}>
            <View style={styles.iconContainer}>
              {icon}
            </View>
            <Text style={styles.title}>{title}</Text>
            <ScrollView
              style={{ maxHeight: scrollMaxHeight, alignSelf: 'stretch' }}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              scrollEnabled={true}
              alwaysBounceVertical={true}
              keyboardShouldPersistTaps="handled"
            >
              {typeof description === 'string'
                ? <Text style={styles.message}>{description}</Text>
                : description}
            </ScrollView>
            <View style={styles.buttons}>
              <DebouncedTouchableOpacity
                style={[styles.button, { backgroundColor: cancelButtonColor }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelText, { color: cancelTextColor }]}>{cancelText}</Text>
              </DebouncedTouchableOpacity>
              <DebouncedTouchableOpacity
                style={[styles.button, { backgroundColor: confirmButtonColor }]}
                onPress={onConfirm}
              >
                <Text style={[styles.confirmText, { color: confirmTextColor }]}>{confirmText}</Text>
              </DebouncedTouchableOpacity>
            </View>
          </View>
        {/* </TouchableWithoutFeedback> */}
        {/* This Pressable is the overlay, closes only when tapping outside modal */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 0,
    width: '85%',
    maxHeight: windowHeight * 0.8,
    alignItems: 'center',
    elevation: 8,
    overflow: 'hidden',
    zIndex: 2,
  },
  iconContainer: {
    backgroundColor: '#ffece0',
    borderRadius: 50,
    padding: 18,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    marginTop: 16,
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
    marginBottom: 0,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
