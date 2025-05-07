import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, IconButton, Text, ActivityIndicator } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeCartItem, updateCartItem } from '../api/api';
import { Minus, Plus } from 'lucide-react-native';

const CartItem = ({ product, cartsLoading, cartItems }) => {
  const initialStock = product?.productId?.stock || 0;
  const initialQuantity = product?.quantity || 0;
  const [quantity, setQuantity] = useState(initialQuantity);
  const [hasChanged, setHasChanged] = useState(false);
  const queryClient = useQueryClient();

  const changeQuantity = (change) => {
    const newQuantity = quantity + change;

    if (change === 1) {
      let sum = cartItems.reduce((acc, cart) => acc + cart.quantity, 0);
      if (sum + quantity - initialQuantity >= 5) {
        alert("Product limit reached. No more allowed.");
        return;
      }
    }

    if (newQuantity > 0 && newQuantity <= initialStock + initialQuantity) {
      setQuantity(newQuantity);
      setHasChanged(true);
      updateMutation.mutate()
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (quantity > 0) {
        let sum = cartItems.reduce((acc, cart) => acc + cart.quantity, 0);
        // if (sum + quantity - initialQuantity > 5) {
        //   alert("Product limit reached. No more allowed.");
        //   setQuantity(initialQuantity);
        //   return;
        // }
      }
      return await updateCartItem(product._id, quantity);
    },
    onSuccess: async () => {
      setHasChanged(false);
      await queryClient.invalidateQueries(['cartItems']);
    },
    onError: (error) => {
      console.error("Error updating cart item:", error);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => await removeCartItem(product._id),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['cartItems']);
    },
    onError: (error) => {
      console.error("Error removing cart item:", error);
    },
  });

  if (!product || !product.productId) {
    return <Text>Invalid product data</Text>;
  }

  if (cartsLoading) return <ActivityIndicator animating={true} />;

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <Image
          source={{ uri: product.productId.image_url?.replace("http://", "https://") }}
          style={styles.image}
        />
        <View style={styles.details}>
          <Title style={styles.title}>{product.productId.name}</Title>
          <Paragraph style={styles.price}>Rs. {product.productId.price * quantity}</Paragraph>
          <View style={styles.quantityAndActions}>
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityText}>Qty: {quantity}</Text>
              <View style={styles.quantityButtons}>
                <TouchableOpacity style={[styles.quantityButton, updateMutation.isPending ? styles.disabledButton : null]}
                disabled={updateMutation.isPending}
                onPress={() => changeQuantity(1)}>
                  <Plus size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quantityButton, updateMutation.isPending || quantity == 1 ? styles.disabledButton : null]}
                disabled={updateMutation.isPending}
                onPress={() => changeQuantity(-1)}>
                  <Minus size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.actionButtons}>
              {/* {hasChanged && (
                <TouchableOpacity
                  onPress={() => updateMutation.mutate()}
                  disabled={updateMutation.isLoading}
                  style={styles.updateButton}
                  labelStyle={styles.buttonLabel}
                  compact
                >
                  <Text style={{color: "white"}}>{updateMutation.isLoading ? "..." : "Update"}</Text>
                </TouchableOpacity>
              )} */}
              <TouchableOpacity
                mode="outlined"
                onPress={() => removeMutation.mutate()}
                disabled={removeMutation.isLoading}
                style={styles.removeButton}
                // labelStyle={styles.buttonLabel}
                compact
              >
                <Text style={{color: "white"}}>{removeMutation.isLoading ? "Removing..." : "Remove"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 8,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  details: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    marginBottom: 2,
    lineHeight: 16,
  },
  price: {
    fontSize: 14,
    marginBottom: 2,
  },
  quantityAndActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 12,
    marginRight: 8,
  },
  quantityButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    padding: 8,
    marginHorizontal: 4,
    backgroundColor: "#f97316",
    borderRadius: "50%",
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  updateButton: {
    marginRight: 4,
    // height: 32,
    padding: 8,
    paddingHorizontal: 12,
    
    borderRadius: 50,
    backgroundColor: "green",
  },
  disabledButton: {
    backgroundColor: "#d3d3d3",
  },
  removeButton: {
    backgroundColor: 'red',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 50,
    // borderColor: "red"
  },
});

export default CartItem;
