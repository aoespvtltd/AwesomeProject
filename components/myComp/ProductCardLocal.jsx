import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Button, Card, Text, Dialog, Portal } from 'react-native-paper';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator } from 'react-native-paper';

const CartIcon = require("../../assets/Cart1.png");
const TingSound = require("../../assets/ting.mp3");

function ProductCardLocal({ product, myCart, setIsChanged, refetch, clear, totalLength: initialLength }) {
  const [localStock, setLocalStock] = useState(product.stock);
  const [total, setTotal] = useState(initialLength);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isOutOfStock = localStock === 0;

  useEffect(() => {
    AsyncStorage.removeItem('cart');
  }, []);

  const updateLocalStock = async () => {
    const cartString = await AsyncStorage.getItem('cart');
    const cart = cartString ? JSON.parse(cartString) : [];
    const cartItem = cart.find(item => item.productId === product._id);
    
    if (cartItem) {
      setLocalStock(product.stock - cartItem.quantity);
    } else {
      setLocalStock(product.stock);
    }
  };

  useEffect(() => {
    updateLocalStock();
  }, [myCart, product]);

  const handleAddToCart = async () => {
    const cartString = await AsyncStorage.getItem('cart');
    const localStorageCart = cartString ? JSON.parse(cartString) : [];
    let sum = 0, sumBackend = 0;
    myCart.forEach(cart => {
      sumBackend += cart.quantity;
    });
    localStorageCart.forEach(element => {
      sum += element.quantity;
    });

    setTotal(initialLength + sum);

    if (sum + sumBackend >= 5) {
      setIsDialogOpen(true);
      return;
    }

    const cart = cartString ? JSON.parse(cartString) : [];
    const existingProduct = cart.find(item => item.productId === product._id);

    if (existingProduct) {
      if (existingProduct.quantity <= product.stock) {
        existingProduct.quantity += 1;
        setLocalStock(prev => prev - 1);
      } else {
        setIsDialogOpen(true);
        return;
      }
    } else {
      cart.push({ productId: product._id, quantity: 1 });
      setLocalStock(prev => prev - 1);
    }

    const { sound } = await Audio.Sound.createAsync(TingSound);
    await sound.playAsync();

    await AsyncStorage.setItem('cart', JSON.stringify(cart));
    setIsChanged(true);
    refetch.cartRefetch();
  };

  useEffect(() => {
    updateLocalStock();
  }, [product.stock, myCart]);

  const buttonLabel = isOutOfStock ? 'Out of Stock' : 'Add to Cart';

  return (
    <Card style={styles.card}>
      <Card.Cover source={{ uri: product.image_url }} style={styles.cardCover} />
      <View style={styles.productNumber}>
        <Text style={styles.productNumberText}>{product.productNumber}</Text>
      </View>
      <Card.Content style={styles.cardContent}>
        <Text numberOfLines={2} style={styles.productName}>{product.name}</Text>
        <View style={styles.priceStockContainer}>
          <Text style={styles.price}>Rs. {product.price}</Text>
          <Text style={styles.stock}>
            Qty: {clear ? <ActivityIndicator size="small" color="#888" /> : localStock}
          </Text>
        </View>
      </Card.Content>
      <Card.Actions>
        <Button
          icon="cart"
          mode="contained"
          onPress={handleAddToCart}
          disabled={isOutOfStock}
          style={styles.addButton}
          labelStyle={styles.buttonLabel}
        >
          {buttonLabel}
        </Button>
      </Card.Actions>

      <Portal>
        <Dialog visible={isDialogOpen} onDismiss={() => setIsDialogOpen(false)}>
          <Dialog.Title>Item Limit Reached</Dialog.Title>
          <Dialog.Content>
            <Text>Items quantity cannot exceed 5.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsDialogOpen(false)}>Okay</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 8,
    elevation: 4,
    // here to apply backgorund color
  },
  cardCover: {
    height: 160,
  },
  productNumber: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productNumberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  cardContent: {
    padding: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    height: 40,
  },
  priceStockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontWeight: 'bold',
  },
  stock: {
    color: '#666',
  },
  addButton: {
    width: '100%',
    marginTop: 8,
  },
  buttonLabel: {
    fontSize: 12,
  },
});

export default ProductCardLocal;