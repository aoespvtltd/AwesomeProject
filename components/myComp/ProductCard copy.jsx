import React, { memo, useState, useCallback } from "react";
import { View, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Card, Text, Badge } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addToCart } from "../api/api";
import { ShoppingCart } from "lucide-react-native";
import { Dimensions } from "react-native";
import AddToCartButton from "./AddToCartButton";

const screenWidth = Dimensions.get("window").width;

const ProductCard = memo(({ product, onAddToCart, refetch, setIsChanged }) => {
  const queryClient = useQueryClient();
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const isOutOfStock = product.stock === 0;

  const { mutate: addToCartMutate, isLoading: isPending } = useMutation({
    mutationFn: () => addToCart(product._id),
    onMutate: () => setIsButtonDisabled(true),
    onSuccess: async () => {
      queryClient.setQueryData(["products"], (oldData) => {
        if (!oldData?.data?.data) return oldData;
        const updatedProducts = oldData.data.data.map((p) =>
          p._id === product._id ? { ...p, stock: p.stock - 1 } : p
        );
        return { ...oldData, data: { ...oldData.data, data: updatedProducts } };
      });
      onAddToCart();
      refetch();
      setIsButtonDisabled(false);
    },
    onError: () => setIsButtonDisabled(false),
  });

  const handleAddToCart = useCallback(() => {
    setIsChanged(true);
    addToCartMutate();
  }, [addToCartMutate, setIsChanged]);

  const buttonLabel = isOutOfStock ? "Out of Stock" : isPending ? "Adding..." : "Add to Cart";
  const isDisabled = isOutOfStock || isPending || isButtonDisabled;

  console.log(product.name, product.productNumber);

  return (
    <Card style={styles.card}>
      <Image
        source={{
          uri: product.image_url?.replace(/^http:\/\//, "https://"),
        }}
        style={styles.image}
      />
      {/* <View style={styles.image}></View> */}
      <Badge style={styles.productNumberBadge}>{product.productNumber}</Badge>
      <Card.Title title={product.name} titleStyle={styles.productName} titleNumberOfLines={2} />
      <Card.Content style={styles.cardContent}>
        <View style={styles.priceAndStock}>
          <Text style={styles.price}>Rs. {product.price}</Text>
          <Text style={styles.stock}>In Stock: {product.stock}</Text>
        </View>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <AddToCartButton
          isDisabled={isDisabled}
          buttonLabel={buttonLabel}
          onPress={handleAddToCart}
        />
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
  },
  image: {
    // height: 110,
    aspectRatio: 1,
    zIndex: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    // margin: 8,
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
    marginBottom: -8,
    marginHorizontal: -4,
    lineHeight: 18,
  },
  cardContent: {
    // padding: 8,
    // marginBottom: -8,
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
