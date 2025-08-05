// import { useNavigation } from 'expo-router';
import React from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

export default function ErrorPage({ message="No internet connection", setRoute, refreshFunctions, route }) {
  // const navigate = useNavigation();
  // const location = useLocation();

  if (!refreshFunctions){
    setRoute(route => (route === "home" ? "homecopy" : "home"))
  }else{
    refreshFunctions()
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>
          {message}
        </Text>
        <TouchableOpacity
          onPress={() => setRoute(route => (route === "home" ? "homecopy" : "home"))}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <Image
        // source={{ uri: "https://cdn-icons-png.flaticon.com/512/2621/2621165.png" }}
        source={require("../../src/assets/noInternet.png")}
        style={styles.errorImage}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  contentContainer: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 18,
    color: '#4b5563',
    // marginVertical: 16,
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: 64,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  errorImage: {
    marginTop: 32,
    width: 300,
    height: 300,
  },
});
