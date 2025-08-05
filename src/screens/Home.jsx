import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  useRef,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
  Alert,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCartItems,
  getProducts,
  clearCart,
  getCartLength,
  getOffer,
  getappVersion,
  getUnpaidCartsByMachine,
  removeCartItem,
} from '../../components/api/api';
import {categories} from '../../components/api/categories';
import ProductCard from '../../components/myComp/ProductCard';
import CategoryButtons from '../../components/myComp/CategoryButtons';
import LoadingComp from '../../components/myComp/LoadingComp';
import Keypad from '../../components/myComp/Keypad';
import {SafeAreaView} from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import {appVersion, columns} from '../constants';
import {FlashList} from '@shopify/flash-list';
import ErrorPage from '../../components/myComp/ErrorPage';
import {
  Cross,
  Loader,
  PhoneForwardedIcon,
  QrCode,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react-native';
import {initializePort} from './Checkout';
import {Badge} from 'react-native-paper';
import DebounceTouchableOpacity from '../../components/myComp/DebounceTouchableOpacity';
import updateUtil from '../utils/updateUtil';
import {startupChecklist} from '../utils/startupChecklist';

// Move these outside component to prevent recreation
const {width} = Dimensions.get('window');
const dimen = Dimensions.get('window');
const productWidth =
  dimen.width * dimen.scale >= 1000 ? (width - 8) / 4 : (width - 8) / 3;

function VendingMachine({route, setRoute, timer, resetTimer}) {
  // State management for various features
  const [category, setCategory] = useState(''); // Current selected category
  const [inputValue, setInputValue] = useState(''); // Keypad input value
  const [isConnected, setIsConnected] = useState(true); // Network connection status
  const [cartLength, setCartLength] = useState(0); // Number of items in cart
  const [initialLength, setInitialLength] = useState(0); // Initial cart length
  const [isChanged, setIsChanged] = useState(false); // Track cart changes
  const [isKeypadVisible, setIsKeypadVisible] = useState(false); // Keypad visibility
  const [serialPort, setSerialPort] = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const scaleValue = useRef(new Animated.Value(1)).current;
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

  useEffect(() => {
    const cleanups = [];
    startupChecklist.forEach(check => {
      const result = check(setIsConnected);
      if (typeof result === 'function') cleanups.push(result);
    });
    return () => {
      cleanups.forEach(fn => fn && fn());
    };
  }, []);

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
    refetch: cartLengthRefetch,
  } = useQuery({
    queryKey: ['cartLength'],
    queryFn: async () => {
      const length = await getCartLength();
      return length.data.data.cartLength || 0;
    },
  });

  // Query hook for cart length
  const {
    data: cartData,
    isLoading: cartsLoading,
    error: cartsError,
    refetch: cartRefetch,
  } = useQuery({
    queryKey: ['cartData'],
    queryFn: async () => {
      const data = await getCartItems();
      return data?.data?.data;
    },
  });

  // Mutation for clearing cart
  const clearCartMutation = useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      queryClient.invalidateQueries(['cartLength']);
      queryClient.invalidateQueries(['cartData']);
      setCartLength(0);
      handleProductRefetch();
      cartRefetch();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async itemId => {
      setDeletingItemId(itemId);
      return await removeCartItem(itemId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['cartData']);
      await queryClient.invalidateQueries(['cartLength']);
      await handleProductRefetch();
      setCartLength(prev => Math.max(0, prev - 1));
      setDeletingItemId(null);
    },
    onError: error => {
      console.error('Error removing cart item:', error);
      setDeletingItemId(null);
    },
  });

  // Memoized callbacks for refetching data
  const handleCartRefetch = useCallback(() => {
    cartRefetch();
  }, [cartRefetch]);

  const handleProductRefetch = useCallback(() => {
    productRefetch();
    cartRefetch();
  }, [productRefetch, cartRefetch]);

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
          isConnected={isConnected}
          timer={timer}
          resetTimer={resetTimer}
        />
      </View>
    ),
    [handleProductRefetch, handleCartUpdate],
  );

  // Render individual product items
  const renderCartItem = useCallback(
    ({item, index}) => (
      <View key={item._id || index} style={styles.cartItemContainer}>
        {/* ❌ Remove Button */}
        <TouchableOpacity
          onPress={() => removeMutation.mutate(item._id)}
          disabled={removeMutation.isPending}
          style={styles.removeButton}>
          {removeMutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <X color={'white'} size={12} />
          )}
        </TouchableOpacity>

        {/* 🟢 Quantity Badge */}
        <Badge style={styles.quantityBadge}>x{item.quantity}</Badge>

        {/* 🖼️ Product Image */}
        <Image
          source={{
            uri: item?.productId?.image_url?.replace('http://', 'https://'),
          }}
          style={styles.cartItemImage}
        />
      </View>
    ),
    [handleProductRefetch, handleCartUpdate],
  );
  console.log('isConnected', isConnected);
  // Effect to update initial cart length
  useEffect(() => {
    if (cartLengthData !== undefined) {
      setCartLength(cartLengthData);
    }
  }, [cartLengthData]);

  // Effect to monitor network connectivity
  useEffect(() => {
    const unsubscribe = refreshFunctions();

    // Cleanup the listener on unmount
    return () => unsubscribe();
  }, []);

  const refreshFunctions = () => {
    productRefetch();
    cartRefetch();
    initializePort();
    getMachineId();
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return unsubscribe;
  };

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

  const handleClearCart = async () => {
    await clearCartMutation.mutate();
    resetTimer();
    await handleProductRefetch();
  };

  // Update cart count handler
  const handleCartUpdate = useCallback(
    (increment = true) => {
      setCartLength(prev => (increment ? prev + 1 : prev - 1));
      scaleValue.setValue(1.2);
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    },
    [scaleValue],
  );

  useEffect(() => {
    const checkAndDownload = async () => {
      try {
        const update = await updateUtil.checkForUpdate();
        console.log('update available');
        if (update.available) {
          await updateUtil.downloadApk(update.appUrl);
        } else {
          // No update available, check if APK file exists and delete it
          const apkInfo = await updateUtil.getApkInfo();
          if (apkInfo.exists) {
            await updateUtil.cleanupApk();
            console.log('Old APK deleted since no update is available');
          }
        }
      } catch (e) {
        // Optionally log error, but do not alert user
        console.log('Silent update check/download failed:', e);
      }
    };
    checkAndDownload();
  }, []);

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
        <DebounceTouchableOpacity
          onPress={() => setRoute('home')}
          style={styles.logoContainer}>
          <Image
            // source={{uri: 'https://files.catbox.moe/xw6iaj.png'}}
            source={require('../assets/lphaVend.png')}
            style={styles.logo}
          />
          {/* <Text style={styles.title}>Vending</Text> */}
        </DebounceTouchableOpacity>
        {/* <Text>{timer}</Text> */}
        <View style={styles.navButtons}>
          {cartLength > 0 && cartData?.length > 0 &&  (
            <TouchableOpacity
              onPress={handleClearCart}
              style={styles.clearButton}
              disabled={clearCartMutation.isPending}>
              {/* <Text style={styles.clearButtonText}>Clear</Text> */}
              {clearCartMutation.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Trash2 stroke={'white'} />
              )}
            </TouchableOpacity>
          )}
          <Animated.View style={{transform: [{scale: scaleValue}]}}>
            <DebounceTouchableOpacity
              onPress={() => {
                resetTimer();
                setRoute('carts');
              }}
              style={{
                flexDirection: 'row',
                borderRadius: 8,
                overflow: 'hidden',
              }}>
              <View
                style={{
                  backgroundColor: '#ff6600',
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}>
                <ShoppingCart color="white" size={18} strokeWidth={3} />
                <Text
                  style={{color: 'white', fontWeight: 'bold', fontSize: 10}}>
                  Cart
                </Text>
              </View>
              {!!cartLength && cartData?.length > 0 &&  (
                <View
                  style={{
                    backgroundColor: '#2f2f2f',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 40,
                  }}>
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 20,
                      fontWeight: 'bold',
                    }}>
                    {cartLength}
                  </Text>
                </View>
              )}
            </DebounceTouchableOpacity>
          </Animated.View>
        </View>
      </View>

      <View style={styles.mainContent}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            justifyContent: 'center',
            backgroundColor: '#ff6600',
            gap: 10,
            padding: 10,
          }}>
          <Text style={{color: 'white', fontSize: 16, fontWeight: 'bold'}}>
            {isLoading
              ? 'Loading...'
              : error
              ? 'No offer'
              : offerData?.data?.data?.message}
          </Text>
        </View>

        {/* Category buttons for filtering products */}
        <CategoryButtons
          categories={categories}
          onCategorySelect={setCategory}
          activeCategory={category}
        />

        {/* Product list using FlashList for better performance */}
        {productsLoading ? (
          // <LoadingComp />
          <View
            style={{
              height: '100%',
              justifyContent: 'center',
              paddingBottom: 32,
            }}>
            <ActivityIndicator size={64} height={'100'} color={'#ff6600'} />
          </View>
        ) : productsError ? (
          // <View style={{flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%'}}>
          //   <Image
          //     source={require('../assets/noInternet.png')}
          //     style={{width: '100%', height: undefined, aspectRatio: 1,
          //       //  maxWidth: 600, maxHeight: 600,
          //       resizeMode: 'cover'}}
          //   />
          // </View>
          <ErrorPage
            message={productsError?.message}
            setRoute={setRoute}
            refreshFunctions={refreshFunctions}
            route={route}
          />
        ) : filteredProducts.length > 0 ? (
          <FlashList
            data={filteredProducts}
            renderItem={renderProductItem}
            estimatedItemSize={200}
            numColumns={dimen.width * dimen.scale >= 1000 ? 4 : 3}
            keyExtractor={item => item._id}
            contentContainerStyle={{
              paddingHorizontal: 8,
              backgroundColor: 'white',
            }}
            windowSize={4}
          />
        ) : (
          <View
            style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{fontSize: 20, fontWeight: 'bold'}}>
              No products found
            </Text>
          </View>
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
          resetTimer={resetTimer}
        />
      </View>

      {/* Footer bar at the very bottom */}
      {cartData?.length > 0 && (
        <View style={styles.cartBarContainer}>
          <View style={styles.cartBarContent}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cartItemsContainer}>
              {cartData.map(item => (
                <View key={item._id} style={styles.cartItemContainer}>
                  {/* ❌ Remove Button */}
                  <TouchableOpacity
                    onPress={() => removeMutation.mutate(item._id)}
                    disabled={
                      removeMutation.isPending && deletingItemId === item._id
                    }
                    style={styles.removeButton}>
                    {removeMutation.isPending && deletingItemId === item._id ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <X color={'white'} size={18} />
                    )}
                  </TouchableOpacity>

                  {/* 🟢 Quantity Badge */}
                  <Badge style={styles.quantityBadge} size={24}>
                    x{item.quantity}
                  </Badge>

                  {/* 🖼️ Product Image */}
                  <Image
                    source={{
                      uri: item?.productId?.image_url?.replace(
                        'http://',
                        'https://',
                      ),
                    }}
                    style={styles.cartItemImage}
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.checkoutSection}>
              <Text style={styles.totalText}>
                Total: Rs.{' '}
                {cartData.reduce(
                  (sum, item) => sum + item.productId.price * item.quantity,
                  0,
                )}
              </Text>
              <DebounceTouchableOpacity
                onPress={() => {
                  resetTimer()
                  setRoute('uartBlank')}}
                style={styles.checkoutButton}>
                <Text style={styles.checkoutButtonText}>Checkout</Text>
              </DebounceTouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 0,
    margin: 0,
  },
  offlineBanner: {
    backgroundColor: '#dc2626', // Red color
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 1000,
  },
  offlineText: {
    color: 'white',
    fontSize: 20,
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
    gap: 8,
  },
  clearButton: {
    backgroundColor: '#f97316',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    // marginRight: 12,
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
    // top: -8,
    right: 0,
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
    margin: 4,
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
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  cartBarContainer: {
    minHeight: 100,
    maxHeight: 160,
    padding: 2,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff3e6',
    borderTopWidth: 1,
    borderTopColor: '#ffd6b3',
  },
  cartBarContent: {
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
  cartItemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  cartItemContainer: {
    marginHorizontal: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    padding: 8,
    height: 80,
    width: 80,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  removeButton: {
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 2,
    backgroundColor: '#ff4d4d',
    width: 24,
    height: 24,
    borderRadius: 99,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    zIndex: 1,
    backgroundColor: '#2f2f2f',
    color: 'white',
    textAlign: 'center',
    justifyContent: 'center',
    // fontWeight: 'bold',
    fontSize: 13,
  },
  cartItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    resizeMode: 'contain',
  },
  checkoutSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#ffd6b3', // Light orange border
    backgroundColor: '#fff', // White background for checkout section
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  checkoutButton: {
    backgroundColor: '#f97316',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

// Memoize the entire component
export default memo(VendingMachine);
