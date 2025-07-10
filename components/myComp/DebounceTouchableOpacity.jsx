import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';

const DebounceTouchableOpacity = ({ onPress, children, activityIndicatorColor = 'white', ...props }) => {
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Clear the timeout when the component unmounts to prevent memory leaks
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handlePress = (event) => {
    if (isDebouncing) {
      return;
    }

    setIsDebouncing(true);
    if (onPress) {
      onPress(event);
    }

    timeoutRef.current = setTimeout(() => {
      setIsDebouncing(false);
    }, 1000); // 1-second debounce duration
  };

  return (
    <TouchableOpacity
      {...props}
      onPress={handlePress}
      disabled={isDebouncing || props.disabled}
    >
      {isDebouncing ? <ActivityIndicator color={activityIndicatorColor} /> : children}
    </TouchableOpacity>
  );
};

export default DebounceTouchableOpacity; 