import React, { memo } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { ShoppingCart } from "lucide-react-native";

const AddToCartButton = memo(({ isDisabled, buttonLabel, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.button, isDisabled ? styles.disabledButton : null]}
    >
      <ShoppingCart size={20} color={"white"} style={styles.icon} />
      <Text style={styles.buttonLabel}>{buttonLabel}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f97316",
    justifyContent: "center",
    width: "100%",
  },
  disabledButton: {
    backgroundColor: "#d3d3d3",
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    marginLeft: 8,
  },
  icon: {
    marginRight: 4,
  },
});

export default AddToCartButton; 