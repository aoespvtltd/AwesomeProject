// src/utils/startupChecklist.js

import updateUtil from './updateUtil';
import { initializePort } from '../screens/Checkout';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCodes } from '../../components/api/api';

export const startupChecklist = [
  async () => {
    // Check for update with error handling
    try {
      const update = await updateUtil.checkForUpdate();
      console.log("check for update");
      if (update.available) {
        await updateUtil.downloadApk(update.appUrl);
      } else {
        const apkInfo = await updateUtil.getApkInfo();
        if (apkInfo.exists) {
          await updateUtil.cleanupApk();
        }
      }
    } catch (e) {
      console.log("Error checking for update:", e);
      // Don't throw error, just log it
    }
  },
  () => {
    // Initialize serial port with error handling
    try {
      initializePort();
    } catch (error) {
      console.log("Error initializing serial port:", error);
    }
  },
  (setIsConnected) => {
    console.log("check internet");
    // Network connectivity with error handling
    try {
      const unsubscribe = NetInfo.addEventListener(state => {
        setIsConnected(state.isConnected);
      });
      return unsubscribe;
    } catch (error) {
      console.log("Error setting up network listener:", error);
      return () => {}; // Return empty cleanup function
    }
  },
  async () => {
    // Get machine ID with error handling
    try {
      await AsyncStorage.getItem('machineId');
    } catch (error) {
      console.log("Error getting machine ID from startup checklist:", error);
    }
  },
  // Add more checks here as needed

  async () => {
    console.log("check for change in keypad codes");
    try {
      const details = await getCodes();
      console.log("codes", details?.data?.data?.codes);
      if (details?.data?.data?.codes) {
        await AsyncStorage.setItem("codes", details.data.data.codes);
      }
    } catch (error) {
      console.log("Error fetching secret codes:", error);
      // Don't throw error, just log it
    }
  }
];