// import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Keyboard,
  Alert,
} from "react-native";
import { FAB, Icon } from "react-native-paper";
import { addToCartByPN } from "../api/api";
import { Trash, Trash2 } from "lucide-react-native";

// Define an object that maps key combinations to routes
const secretCodes = {
  "9876543210": "fillstock",
  "9876543211": "findserial",
  "9876543212": "login",
  "9876543213": "machines",
  "9876543214": "test"
};

const Keypad = ({
  inputValue,
  setInputValue,
  isKeypadVisible,
  setIsKeypadVisible,
  filteredProducts,
  qty,
  clearCart,
  setRoute
}) => {
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
            setRoute("nepalCheckout")
          })
          .catch((error) => {
            createTwoButtonAlert()
            console.log(error)
          });
      })
      .catch((error) => console.log(error));
  };

  const handleSecretCode = (value) => {
    // Check if the input matches any secret code
    const destination = secretCodes[value];
    if (destination) {
      setRoute(destination); // Navigate to the corresponding route
      setInputValue(""); // Clear the input
    }
  };

  return (
    <View style={styles.keypadContainer}>
    <FAB
      onPress={toggleKeypad}
      style={{
        position: "absolute",
        margin: 16,
        right: 0,
        bottom: 0,
        borderRadius: "50%",
        backgroundColor: "#f26c18",
      }}  
      icon={
        isKeypadVisible
          ? 
          { uri: "https://files.catbox.moe/tmdz0g.png" }
          : { uri: "https://files.catbox.moe/df4lp3.png" }
      }
    />
    {/* {inputValue == "9876543210" && (<FAB
      onPress={()=>setRoute("fillstock")}
      style={{
        position: "absolute",
        margin: 16,
        bottom: 48,
        alignSelf:"center",
        borderRadius: "5%",
        backgroundColor: "#f26c18",
      }}
      label="Fill Stock"
    />)} */}
      {filteredProducts.length === 1 && filteredProducts[0]?.stock !== 0 && console.log(filteredProducts.length, qty)}

      {isKeypadVisible && (
        <View style={styles.inputWithCart}>
          <FAB
            onPress={buyByProductNumber}
            // disabled={filteredProducts.length === 1 || filteredProducts[0]?.stock === 0}
            disabled={filteredProducts.length !== 1}
            style={[(filteredProducts.length !== 1 && qty !== 0) ? styles.disabledCartButton : styles.cartButton,]}
            icon={{uri: "https://files.catbox.moe/qb07e6.png"}}
            label="Buy Now"
          />
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
      {Object.entries(secretCodes).map(([code, route]) => (
        inputValue === code && (
          <FAB
            key={code}
            onPress={() => handleSecretCode(code)}
            style={styles.secretButton}
            icon={{ uri: "https://files.catbox.moe/df4lp3.png" }}
            label={`Go to ${route}`}
          />
        )
      ))}
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
    backgroundColor: "#f26c18"
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
    position: "absolute",
    margin: 16,
    bottom: 48,
    alignSelf: "center",
    borderRadius: "5%",
    backgroundColor: "#f26c18",
  },
});

export default Keypad;
