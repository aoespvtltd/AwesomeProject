import React, { memo, useState, useCallback } from "react";
import { View, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Card, Text, Badge } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addToCart } from "../api/api";
import { ShoppingCart } from "lucide-react-native";
import { Dimensions } from "react-native";
import { columns } from "../../src/constants";

const screenWidth = Dimensions.get("window").width;
// const productWidth = (screenWidth - 90) / columns;

const ProductCard = memo(({ product, refetch, setIsChanged, setCartCount }) => {
  const queryClient = useQueryClient();
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const isOutOfStock = product.stock === 0;

  const {mutate: addToCartMutate, isPending, data: addToCartData} = useMutation({
    mutationFn: async ()=>{
      return await addToCart(product._id)
    },
    onSuccess: ()=>{
      refetch()
      setIsChanged(true)
      setCartCount(prev=>prev+1)
    }
  })
  const handleAddToCart = useCallback(() => {
    addToCartMutate();
  }, [addToCartMutate]);

  const buttonLabel = isOutOfStock ? "Out of Stock" : isPending ? "Adding..." : "Add to Cart";
  const isDisabled = isOutOfStock || isPending || isButtonDisabled;

  return (
    <Card style={styles.card}>
      <Image
        source={{
          uri: product.image_url?.replace(/^http:\/\//, "https://"),
        }}
        style={styles.image}
      />
      <Badge style={styles.productNumberBadge}>{product.productNumber}</Badge>
      <Card.Title title={product.name} titleStyle={styles.productName} titleNumberOfLines={2} />
      <Card.Content style={styles.cardContent}>
        <View style={styles.priceAndStock}>
          <Text style={styles.price}>Rs. {product.price}</Text>
          <Text style={styles.stock}>In Stock: {isPending ? product.stock -1  : product.stock }</Text>
        </View>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <TouchableOpacity
          onPress={handleAddToCart}
          disabled={isDisabled}
          style={[
            styles.button,
            isDisabled ? styles.disabledButton : null,
          ]}
        >
          <ShoppingCart size={20} color={"white"} style={styles.icon} />
          <Text style={styles.buttonLabel}>{buttonLabel}</Text>
        </TouchableOpacity>
      </Card.Actions>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 8,
    elevation: 4,
    backgroundColor: "white",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    height: 145,
    aspectRatio: 1,
    marginHorizontal: "auto",
    // width: 145,
    zIndex: 100,
    // borderTopLeftRadius: 12,
    // borderTopRightRadius: 12,
    borderRadius: 12,
    margin: 8,
  },
  productNumberBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 120,
    backgroundColor: "#333",
    color: "#fff",
    fontSize: 12,
    height: 24,
    minWidth: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    justifyContent: "center",
    display: "flex",
  },
  productName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginTop: 4,
  },
  cardContent: {
    padding: 8,
  },
  priceAndStock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#f97316",
  },
  stock: {
    fontSize: 12,
    color: "#666",
  },
  cardActions: {
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  button: {
    flexDirection: "row", // Make the icon and text align properly
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
    marginLeft: 8, // Add space between icon and text
  },
  icon: {
    marginRight: 4, // Space for better alignment
  },
});

export default ProductCard;
