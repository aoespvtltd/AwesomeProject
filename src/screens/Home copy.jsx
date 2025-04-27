import React, {useState, useEffect, useCallback, useMemo, memo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCartItems,
  getProducts,
  clearCart,
  getCartLength,
  getOffer,
} from '../../components/api/api';
import {categories} from '../../components/api/categories';
import ProductCard from '../../components/myComp/ProductCard';
import CategoryButtons from '../../components/myComp/CategoryButtons';
import LoadingComp from '../../components/myComp/LoadingComp';
import Keypad from '../../components/myComp/Keypad';
import {SafeAreaView} from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import {columns} from '../constants';
import {FlashList} from '@shopify/flash-list';
import ErrorPage from '../../components/myComp/ErrorPage';
import {QrCode, Trash2} from 'lucide-react-native';
import {initializePort} from './Checkout';
// Move these outside component to prevent recreation
const {width} = Dimensions.get('window');
const productWidth = (width - 18) / columns;

function VendingMachine({route, setRoute}) {
  // State management for various features
  const [category, setCategory] = useState(''); // Current selected category
  const [inputValue, setInputValue] = useState(''); // Keypad input value
  const [isConnected, setIsConnected] = useState(true); // Network connection status
  const [cartLength, setCartLength] = useState(0); // Number of items in cart
  const [initialLength, setInitialLength] = useState(0); // Initial cart length
  const [isChanged, setIsChanged] = useState(false); // Track cart changes
  const [isKeypadVisible, setIsKeypadVisible] = useState(false); // Keypad visibility
  const [serialPort, setSerialPort] = useState(null);
  // const router = useRouter();
  const queryClient = useQueryClient();

  // Memoized query function to fetch and sort products
  const getProductsQuery = useCallback(async () => {
    const products = await getProducts();
    return products?.data?.data
      ? {
          ...products,
          data: {
            ...products.data,
            data: products.data.data.sort(
              (a, b) => a.productNumber - b.productNumber,
            ),
          },
        }
      : {data: {data: []}};
  }, []);

  let machineId;
  async function getMachineId() {
    machineId = await AsyncStorage.getItem('machineId');
    return idd;
  }

  // Query hooks for fetching products and cart items
  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
    refetch: productRefetch,
  } = useQuery({
    queryKey: ['products'],
    queryFn: getProductsQuery,
    staleTime: 10 * 1000, // Cache data for 10 seconds
  });

  // Query hook for cart length
  const {
    data: cartLengthData,
    isLoading: cartLoading,
    error: cartError,
    refetch: cartRefetch,
  } = useQuery({
    queryKey: ['cartLength'],
    queryFn: async () => {
      const length = await getCartLength();
      return length.data.data.cartLength || 0;
    },
  });

  // Mutation for clearing cart
  const clearCartMutation = useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      queryClient.invalidateQueries(['cartLength']);
      setCartLength(0);
      cartRefetch();
    },
  });

  // Memoized callbacks for refetching data
  const handleCartRefetch = useCallback(() => {
    cartRefetch();
  }, [cartRefetch]);

  const handleProductRefetch = useCallback(() => {
    productRefetch();
  }, [productRefetch]);

  // Filter products based on category and input value
  const filteredProducts = useMemo(() => {
    if (!products?.data?.data) return [];
    if (!category && !inputValue) return products.data.data;

    let filtered = products.data.data;
    if (category) {
      filtered = filtered.filter(product => product.category === category);
    }
    if (inputValue) {
      filtered = filtered.filter(
        product => product.productNumber.toString() === inputValue,
      );
    }
    return filtered;
  }, [products?.data?.data, category, inputValue]);

  // Render individual product items
  const renderProductItem = useCallback(
    ({item}) => (
      <View style={styles.productItem}>
        <ProductCard
          product={item}
          onCartUpdate={handleCartUpdate}
          refetch={handleProductRefetch}
          setIsChanged={() => setIsChanged(true)}
        />
      </View>
    ),
    [handleProductRefetch, handleCartUpdate],
  );

  // Effect to update initial cart length
  useEffect(() => {
    if (cartLengthData !== undefined) {
      setCartLength(cartLengthData);
    }
  }, [cartLengthData]);

  // Effect to monitor network connectivity
  useEffect(() => {
    productRefetch();
    initializePort();
    getMachineId();
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    // Cleanup the listener on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    productRefetch();
    cartRefetch();
  }, [isConnected]);

  const {
    data: offerData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['offerData', machineId],
    queryFn: getOffer,
  });

  // Handle clearing cart
  // const handleClearCart = useCallback(async () => {
  //   const localStorageCart =
  //     JSON.parse(await AsyncStorage.getItem("cart")) || [];
  //   const productsData = products?.data?.data;
  //   if (productsData) {
  //     localStorageCart.forEach((cartItem) => {
  //       const product = productsData.find((p) => p._id === cartItem.productId);
  //       if (product) {
  //         product.stock += cartItem.quantity;
  //       }
  //     });
  //   }

  //   await AsyncStorage.removeItem("cart");
  //   setIsChanged(false);
  //   await clearCartMutation.mutateAsync();
  // }, [products, clearCartMutation]);

  const handleClearCart = () => {
    clearCartMutation.mutate();
  };

  // Update cart count handler
  const handleCartUpdate = useCallback((increment = true) => {
    setCartLength(prev => (increment ? prev + 1 : prev - 1));
  }, []);

  // Loading and error states
  // if (cartLoading) {
  //   return <LoadingComp />;
  // }

  // if (productsError ) {
  //   return <ErrorPage message={productsError?.message } setRoute={setRoute} />;
  // }

  // Render main component
  return (
    <SafeAreaView style={styles.container}>
      {/* Offline banner */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>No Internet Connection</Text>
        </View>
      )}

      {/* Navigation bar with logo and cart */}
      <View style={styles.navbar}>
        <TouchableOpacity
          // onPress={() => router.navigate("/tryouts/bgColor")}
          // onPress={()=>setRoute("home")}
          onPress={() => setRoute('home')}
          // onPress={() => router.navigate("/tryouts")}
          style={styles.logoContainer}>
          <Image
            source={{uri: 'https://files.catbox.moe/xw6iaj.png'}}
            style={styles.logo}
          />
          {/* <Text style={styles.title}>Vending</Text> */}
        </TouchableOpacity>
        {cartLength ? (
          <TouchableOpacity
            onPress={() => setRoute('nepalCheckout')}
            style={[styles.clearButton, {backgroundColor: "red"}]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <QrCode color="white" size={20} />
              <Text style={{color: 'white', fontSize: 16}}>Checkout</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.navButtons}>
          {cartLength > 0 && (
            <TouchableOpacity
              onPress={handleClearCart}
              style={styles.clearButton}>
              {/* <Text style={styles.clearButtonText}>Clear</Text> */}
              <Trash2 stroke={'white'} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setRoute('carts')}
            style={{padding: 8}}>
            <Image
              source={{uri: 'https://files.catbox.moe/qb07e6.png'}}
              style={styles.cartIcon}
            />
            {cartLength > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartLength}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          justifyContent: 'center',
          backgroundColor: 'red',
          gap: 10,
          marginBottom: 10,
          padding: 10,
        }}>
        <Text style={{color: 'white', fontSize: 16, fontWeight: 'bold'}}>
          {isLoading ? 'Loading...' : offerData?.data?.data?.message}
        </Text>
      </View>

      {/* Category buttons for filtering products */}
      {/* <CategoryButtons
        categories={categories}
        onCategorySelect={setCategory}
        activeCategory={category}
      /> */}

      {/* Product list using FlashList for better performance */}
      {productsLoading ? (
        <LoadingComp />
      ) : productsError ? (
        <ErrorPage message={productsError?.message} setRoute={setRoute} />
      ) : (
        <FlashList
          data={filteredProducts}
          renderItem={renderProductItem}
          estimatedItemSize={200}
          numColumns={columns}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.productList}
          windowSize={3}
        />
      )}

      {/* Keypad component for product number input */}
      <Keypad
        inputValue={inputValue}
        setInputValue={setInputValue}
        isKeypadVisible={isKeypadVisible}
        setIsKeypadVisible={setIsKeypadVisible}
        filteredProducts={filteredProducts}
        qty={filteredProducts[0]?.stock}
        clearCart={clearCart}
        setRoute={setRoute}
      />

      {/* Text Bar */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 0,
    margin: 0,
  },
  offlineBanner: {
    backgroundColor: '#dc2626', // Red color
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 1000,
  },
  offlineText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    // marginBottom: 8
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    height: 30,
    width: 120,
    marginRight: 8,
    // backgroundColor: "red"
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#f97316',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 16,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cartButton: {
    position: 'relative',
  },
  cartIcon: {
    width: 32,
    height: 32,
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productItem: {
    margin: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  productItem: {
    width: productWidth,
    marginBottom: 16,
  },
  scrollTopButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    backgroundColor: 'rgba(156, 163, 175, 0.4)',
    borderRadius: 30,
    padding: 12,
  },
  keypadButton: {
    position: 'fixed',
    width: 60,
    alignItems: 'center',
    zIndex: 100,
    bottom: 16,
    right: 16,
    backgroundColor: '#f97316',
    borderRadius: 30,
    padding: 12,
  },
  keypadIcon: {
    width: 32,
    height: 32,
  },
  textBarContainer: {
    fontSize: 32,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  clearKeypadButton: {
    padding: 16,
  },
  clearKeypadButtonText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  textBar: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 12,
    backgroundColor: '#ddd',
    flex: 1,
    alignItems: 'center',
  },
  textBarText: {
    fontSize: 32,
    color: '#333',
  },
  input: {
    position: 'absolute',
    button: 0,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    width: '80%',
    paddingLeft: 10,
  },
});

// Memoize the entire component
export default memo(VendingMachine);
