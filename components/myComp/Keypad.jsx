// import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Keyboard,
  Alert,
  Image,
} from "react-native";
import { FAB, Icon } from "react-native-paper";
import { addToCartByPN, getCodes } from "../api/api";
import { Trash, Trash2 } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DebounceTouchableOpacity from "./DebounceTouchableOpacity";
import CustomDialog from './CustomDialog';

// Define an object that maps key combinations to routes
// const secretCodes = {
//   "9876543210": "fillstock",
//   "9876543211": "findserial",
//   "9876543212": "login",
//   "9876543213": "machines",
//   "9876543215": "uart"
// };

const secretCodes = {
  // "fillStock": "987",
  "fillStock": "9876543210",
  "findSerial": "9876543211",
  "login": "9876543212",
  "machines": "987",
  "uart": "9876543214",
  "testPage": "9876543215",
  "wifi": "9876543216",
  "ad": "9876543217",
  "settings": "9876543218",
  "findSerialUart": "9876543219",
  // "asyncData": "987"
};

const Keypad = ({
  inputValue,
  setInputValue,
  isKeypadVisible,
  setIsKeypadVisible,
  filteredProducts,
  qty,
  clearCart,
  setRoute,
  resetTimer
}) => {
  // const [secretCodes, setSecretCodes] = useState({});

  // const getSecretCodes = async () => {
  //   try {
  //     const getCodesData = await getCodes()
  //     const codes = getCodesData?.data?.data?.codes
  //     // const codes = await AsyncStorage.getItem("codes");
  //     console.log("Retrieved codes:", codes);
  //     // const parsedCodes = JSON.parse(codes);
  //     setSecretCodes(codes || {});
  //   } catch (error) {
  //     console.error("Error fetching secret codes:", error);
  //     setSecretCodes({});
  //   }
  // };

  // useEffect(() => {
  //   getSecretCodes();
  // }, []);

  const createTwoButtonAlert = () => {
    Alert.alert(
      'Error',
      'Insufficient stock',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel Pressed'),
          style: 'cancel',
        },
        { text: 'OK', onPress: () => console.log('OK Pressed') },
      ]
    );
  };

  // const router = useRouter();

  const openKeypad = () => {
    setIsKeypadVisible(true);
  };

  const toggleKeypad = useCallback(() => {
    resetTimer()
    if (isKeypadVisible) {
      closeKeypad();
    } else {
      openKeypad();
    }
  }, [isKeypadVisible, inputValue]);

  const closeKeypad = () => {
    setInputValue("");
    setIsKeypadVisible(false);
    Keyboard.dismiss(); // Dismiss the keyboard if it's open
  };

  const handleChange = (input) => {
    if (/^\d*$/.test(input)) {
      setInputValue(input); // Update the value with numeric input
    }
  };

  const buyByProductNumber = async () => {
    await clearCart()
      .then(async () => {
        await addToCartByPN(parseInt(inputValue))
          .then(() => {
            // router.push("checkout");
            resetTimer()
            setRoute("uartBlank")
          })
          .catch((error) => {
            createTwoButtonAlert()
            console.log(error)
          });
      })
      .catch((error) => console.log(error));
  };

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleSecretCode = (value) => {
    // Find the route that matches the input value
    const matchingRoute = Object.entries(secretCodes).find(([_, code]) => code === value)?.[0];
    if (matchingRoute) {
      setPendingRoute(matchingRoute);
      setShowPasswordDialog(true);
      setPassword('');
      setPasswordError('');
      setInputValue(''); // Optionally clear input
      return;
    }
  };

  const handlePasswordConfirm = async () => {
    let storedPassword = await AsyncStorage.getItem('keypadPassword');
    if (!storedPassword) storedPassword = 'password123';
    if (password === storedPassword) {
      setShowPasswordDialog(false);
      setPassword('');
      setPasswordError('');
      if (pendingRoute) {
        setRoute(pendingRoute);
        setPendingRoute(null);
      }
    } else {
      setPasswordError('Incorrect password');
    }
  };

  return (
    <View style={styles.keypadContainer}>
    {/* <FAB
      onPress={toggleKeypad}
      style={{
        position: "absolute",
        margin: 16,
        right: 0,
        bottom: 0,
        borderRadius: "50%",
        backgroundColor: "#ff6600",
      }}  
      icon={
        isKeypadVisible
          ? require("../../src/assets/TrashImage.png") : require("../../src/assets/keypadImage.png")
      }
    /> */}
        <TouchableOpacity
      onPress={toggleKeypad}
      style={{
        position: "absolute",
        margin: 16,
        right: 0,
        bottom: 0,
        borderRadius: "50%",
        backgroundColor: "#ff6600",
        alignItems: "center", 
        justifyContent: "center",
        padding: 12
      }}
    >
      <Image source={isKeypadVisible
          ? require("../../src/assets/trash-2.png") : require("../../src/assets/keypadImage.png")
      }
      style={{tintColor: "#f2f2f2", width: 24, height: 24, paddingTop: 12 }}
      />
      {/* <Text>HJello</Text> */}
    </TouchableOpacity>
    {/* {inputValue == "9876543210" && (<FAB
      onPress={()=>setRoute("fillstock")}
      style={{
        position: "absolute",
        margin: 16,
        bottom: 48,
        alignSelf:"center",
        borderRadius: "5%",
        backgroundColor: "#ff6600",
      }}
      label="Fill Stock"
    />)} */}
      {filteredProducts.length === 1 && filteredProducts[0]?.stock !== 0 && console.log(filteredProducts.length, qty)}

      {isKeypadVisible && (
        <View style={styles.inputWithCart}>
          {/* <FAB
            onPress={buyByProductNumber}
            disabled={filteredProducts.length !== 1}
            style={[(filteredProducts.length !== 1 && qty !== 0) ? styles.disabledCartButton : styles.cartButton]}
            icon={require("../../src/assets/cartButton.png")}
            label="Buy Now"
          ></FAB> */}
          <DebounceTouchableOpacity 
            onPress={buyByProductNumber}
            disabled={filteredProducts.length !== 1}
            style={[(filteredProducts.length !== 1 && qty !== 0) ? styles.disabledCartButton : styles.cartButton, {flexDirection: "row", padding: 12, gap: 12, width: 120}]}
            
          >
            <Image source={require("../../src/assets/cartButton.png")} style={{width: 30, height: 30, tintColor: "#f2f2f2"}}/>
            <Text style={{color: "#f2f2f2", fontWeight: "bold"}}>Buy now</Text>
          </DebounceTouchableOpacity>
          {/* <Icon source={"cart"} size={30}/> */}
          <TextInput
            style={styles.textBarContainer}
            keyboardType="numeric"
            autoFocus={true}
            placeholder="Enter a number"
            value={inputValue}
            onChangeText={handleChange}
            onSubmitEditing={() => {
              // Check if there's a matching secret code
              const matchingCode = Object.keys(secretCodes).find(code => code === inputValue);
              if (matchingCode) {
                handleSecretCode(matchingCode);
              } 
              // If no secret code matches and we have a valid product, trigger buy
              else if (filteredProducts.length === 1) {
                buyByProductNumber();
              }
            }}
          />
        </View>
      )}

      {/* Your existing keypad UI */}
      {Object.entries(secretCodes).map(([route, code]) =>
        inputValue === code ? (
          <DebounceTouchableOpacity
            key={code}
            onPress={() => handleSecretCode(code)}
            style={styles.secretButton}>
            <Image
              source={require("../../src/assets/keypadImage.png")}
              style={{width: 24, height: 24, marginRight: 8, tintColor: "#f2f2f2"}}
            />
            <Text style={{color: '#f2f2f2', fontWeight: 'bold'}}>
              Go to {route}
            </Text>
          </DebounceTouchableOpacity>
        ) : null,
      )}
      {/* Password Dialog */}
      <CustomDialog
        visible={showPasswordDialog}
        onClose={() => { setShowPasswordDialog(false); setPassword(''); setPasswordError(''); setPendingRoute(null); }}
        title="Enter Password"
        description={
          <View style={{alignItems: 'center'}}>
            <View style={{flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 8, marginBottom: 8}}>
              <TextInput
                style={{flex: 1, fontSize: 18, padding: 8}}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{padding: 4}}>
                <Text style={{color: '#007AFF', fontWeight: 'bold'}}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={{color: 'red', marginBottom: 4}}>{passwordError}</Text> : null}
          </View>
        }
        confirmText="OK"
        cancelText="Cancel"
        onConfirm={handlePasswordConfirm}
        confirmButtonColor="#ff6600"
        onCancel={() => { setShowPasswordDialog(false); setPassword(''); setPasswordError(''); setPendingRoute(null); }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  keypadContainer: {
    position: "absolute",
    width: "100%",
    bottom: 0,
    right: 0,
    alignSelf: "center",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },
  inputWithCart: {
    flexDirection: "row",
    alignItems: "center",
    width:"80%",
    justifyContent: "center",
    marginVertical: 16,
  },
  cartButton: {
    height: 50,
    width: "auto",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8, // Circular button
    marginHorizontal: 8,
    backgroundColor: "#ff6600"
  },
  disabledCartButton: {
    height: 50,
    width: "auto",
    visibility:"hidden",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8, // Circular button
    marginHorizontal: 8,
    backgroundColor: "#d3d3d3"
  },
  textBarContainer: {
    fontSize: 18,
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  closeButtonText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  secretButton: {
    position: 'absolute',
    margin: 16,
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: '#ff6600',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});

export default Keypad;
