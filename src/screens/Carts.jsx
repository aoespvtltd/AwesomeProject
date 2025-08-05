import React, {useEffect, useState} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Button, Card, Title, Paragraph, Text} from 'react-native-paper';
import {ArrowLeft, ShoppingCart, Trash2} from 'lucide-react-native';
import {
  clearCart,
  finalizePayment,
  getCartItems,
  initiateNepalPay,
} from '../../components/api/api';
import CartItem from '../../components/myComp/CartItem';
import LoadingComp from '../../components/myComp/LoadingComp';
import ErrorPage from '../../components/myComp/ErrorPage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Carts({route, setRoute, resetTimer}) {
  // Initialize React Query client for managing server state
  const queryClient = useQueryClient();

  // State to track the total price of items in cart
  const [total, setTotal] = useState(0);

  // Add state for button disabled
  const [cartDisabled, setCartDisabled] = useState(false);

  // Query hook to fetch cart items from the server
  const {
    data: cartItems,
    isLoading: cartsLoading,
    error: CartFetchError,
    refetch,
  } = useQuery({
    queryKey: ['cartData'],
    queryFn: async () => {
      let response = await getCartItems();
      return response?.data?.data;
    },
    // Disable caching to always fetch fresh cart data
    cacheTime: 0,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
  });

  // Effect to refresh cart data when component mounts and cleanup on unmount
  useEffect(() => {
    // Invalidate and refetch cart data
    queryClient.invalidateQueries(['cartData']);
    refetch();

    // Cleanup function to clear cache when component unmounts
    return () => {
      queryClient.invalidateQueries(['cartData']);
      queryClient.clear();
    };
  }, []);

  // Effect to calculate total price whenever cart items change
  useEffect(() => {
    if (Array.isArray(cartItems)) {
      const newTotal = cartItems.reduce((acc, item) => {
        // Calculate total by multiplying price with quantity
        return acc + (item.productId?.price ?? 0) * (item.quantity ?? 0);
      }, 0);
      setTotal(newTotal);
    }
  }, [cartItems]);

  // Modify the handleClearCart function
  const handleClearCart = async () => {
    try {
      setCartDisabled(true); // Disable button when clicked
      await clearCart();
      queryClient.invalidateQueries(['cartData']);
      setRoute('home');
    } catch (error) {
      console.error('Error clearing cart:', error);
      Alert.alert('Error', 'Failed to clear cart');
    } finally {
      setCartDisabled(false); // Re-enable button regardless of success/failure
    }
  };

  // Test function for payment finalization (development only)
  const testOnly = async () => {
    await finalizePayment();
    setRoute('home');
  };

  const gotoCheckout = async ()=>{
    // initiateNepalPay().then((res)=>{
    //   console.log(res.data.data.data.qrString)
    //   AsyncStorage.setItem("qrString", res.data.data.data.qrString)
    // })
    console.log("object")
    resetTimer()
    setRoute("uartBlank")
  }

  // // Show loading spinner while cart data is being fetched
  // if (cartsLoading) return <LoadingComp />;

  // // Show error message if cart data fetch fails
  // if (CartFetchError) return <Text>Error: {CartFetchError.message}</Text>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setRoute('home')} style={styles.backButton}>
            <ArrowLeft size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.title}>
            Total: Rs. {total}
          </Text>
          {cartItems?.length > 0 && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={handleClearCart}
                style={styles.clearButton}
                disabled={cartDisabled}>
                {cartDisabled ? <ActivityIndicator size="small" color="white" /> : <Trash2 size={20} color="white" strokeWidth={2} />}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => gotoCheckout()}
                // onPress={() => setRoute('nepalCheckout')}
                style={[styles.clearButton, styles.checkoutButton]}>
                <Text style={styles.buttonText}>Checkout</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Cart Items */}
        {/* Cart Items Area */}
        <View style={styles.scrollView}>
          {cartsLoading ? (
            <LoadingComp />
          ) : CartFetchError ? (
            <ErrorPage setRoute={setRoute} />
          ) : cartItems && cartItems?.length > 0 ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {cartItems.map(item => (
                <CartItem
                  key={item._id}
                  product={item}
                  cartsLoading={cartsLoading}
                  cartItems={cartItems}
                />
              ))}
              
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <ShoppingCart size={80} color="#ccc" />
              <Text style={styles.emptyStateTitle}>Your cart is empty</Text>
              <Text style={styles.emptyStateText}>
                Add some items to your cart to get started
              </Text>
              <TouchableOpacity
                mode="contained"
                onPress={() => setRoute('home')}
                style={[styles.clearButton, {borderRadius: 20, paddingHorizontal: 30}]}
                labelStyle={styles.shopButtonText}>
                <Text style={styles.buttonText}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer */}
        {/* {cartItems?.length > 0 && (
          <View style={styles.footer}>
            <View style={styles.subtotalContainer}>
              <Text style={styles.subtotalText}>Subtotal</Text>
              <Text style={styles.subtotalAmount}>Rs. {total}</Text>
            </View>
            <Paragraph style={styles.shippingText}>
              Shipping and taxes calculated at checkout.
            </Paragraph>
            <Button
              mode="contained"
              onPress={() => setRoute('nepalCheckout')}
              style={styles.checkoutButton}
              labelStyle={styles.checkoutButtonText}>
              Checkout
            </Button>
            <Button
              mode="text"
              onPress={() => setRoute('home')}
              style={styles.continueShoppingButton}
              labelStyle={styles.continueShoppingText}>
              Continue Shopping →
            </Button>
          </View>
        )} */}
      </View>
    </SafeAreaView>
  );
}

// Styles for the component
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    elevation: 2,
    gap: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    backgroundColor: '#f97316',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButton: {
    minWidth: 100,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 32,
    marginTop: 16,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: "white"
  },
  footer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 4,
  },
  subtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f97316',
  },
  shippingText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 16,
  },
  continueShoppingButton: {
    marginTop: 8,
  },
  continueShoppingText: {
    color: '#f97316',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
});
