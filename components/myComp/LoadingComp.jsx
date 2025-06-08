import React, { useRef, useEffect } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { Loader } from 'lucide-react-native';

function LoadingComp({message= "Loading, please wait..."}) {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000, // Spin duration in milliseconds
        useNativeDriver: true, // Enable native driver for better performance
      })
    );
    spinAnimation.start();

    return () => spinAnimation.stop(); // Clean up animation
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'], // Spin from 0° to 360°
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Loader size={32} />
        </Animated.View>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    height: "50%",
    justifyContent: 'center',
    alignItems: 'end',
    backgroundColor: '#f3f4f6', // Equivalent to bg-gray-100
    zIndex: 50,
  },
  container: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  text: {
    fontSize: 18, // Equivalent to text-lg
    fontWeight: '600', // Equivalent to font-semibold
    color: '#4b5563', // Equivalent to text-gray-700
    marginTop: 8,
  },
});

export default LoadingComp;
