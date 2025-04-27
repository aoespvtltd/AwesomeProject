import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCartItems, getProducts, clearCart } from "../../components/api/api";
import { categories } from "../../components/api/categories";
import ProductCard from "../../components/myComp/ProductCard";
import CategoryButtons from "../../components/myComp/CategoryButtons";
import LoadingComp from "../../components/myComp/LoadingComp";
import Keypad from "../../components/myComp/Keypad";
import { SafeAreaView } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { columns } from "../constants";
import { FlashList } from "@shopify/flash-list";
// Move these outside component to prevent recreation
const { width } = Dimensions.get("window");
const productWidth = (width - 18) / columns;

function VendingMachine({route, setRoute}) {
  // State management for various features
  const [category, setCategory] = useState(""); // Current selected category
  const [inputValue, setInputValue] = useState(""); // Keypad input value
  const [isConnected, setIsConnected] = useState(true); // Network connection status
  const [cartCount, setCartCount] = useState(0); // Number of items in cart
  const [initialLength, setInitialLength] = useState(0); // Initial cart length
  const [isChanged, setIsChanged] = useState(false); // Track cart changes
  const [isKeypadVisible, setIsKeypadVisible] = useState(false); // Keypad visibility
  // const router = useRouter();
  const queryClient = useQueryClient();

  // Memoized query function to fetch and sort products
  const getProductsQuery = useCallback(async () => {
    const products = await getProducts();
    return products?.data?.data ? {
      ...products,
      data: {
        ...products.data,
        data: products.data.data.sort((a, b) => a.productNumber - b.productNumber),
      },
    } : { data: { data: [] } };
  }, []);

  // Query hooks for fetching products and cart items
  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
    refetch: productRefetch,
  } = useQuery({
    queryKey: ["products"],
    queryFn: getProductsQuery,
    staleTime: 10 * 1000, // Cache data for 10 seconds
  });

  // Query hook for cart items
  const {
    data: cartItems,
    isLoading: cartLoading,
    error: cartError,
    refetch: cartRefetch,
  } = useQuery({
    queryKey: ["cartItems"],
    queryFn: async () => {
      const items = await getCartItems();
      return items && items.data ? items : { data: { data: [] } };
    },
  });

  // Mutation for clearing cart
  const clearCartMutation = useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      queryClient.invalidateQueries(["cartItems"]);
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
      filtered = filtered.filter((product) => product.category === category);
    }
    if (inputValue) {
      filtered = filtered.filter(
        (product) => product.productNumber.toString() === inputValue
      );
    }
    return filtered;
  }, [products?.data?.data, category, inputValue]);

  // Render individual product items
  const renderProductItem = useCallback(
    ({ item }) => (
      <View style={styles.productItem}>
        <ProductCard
          product={item}
          myCart={cartItems}
          refetch={{
            productRefetch: handleProductRefetch,
            cartRefetch: handleCartRefetch
          }}
          setIsChanged={()=>setIsChanged(true)}
        />
      </View>
    ),
    [cartItems, handleProductRefetch, handleCartRefetch]
  );

  // Effect to update initial cart length
  useEffect(() => {
    if (cartItems?.data?.data?.length > 0) {
      setInitialLength(cartItems.data.data[0]?.quantity || 0);
    } else {
      setInitialLength(0);
    }
  }, [cartItems]);

  // Effect to sync cart count between local storage and server
  useEffect(() => {
    const updateCartCount = async () => {
      const localStorageCart =
        JSON.parse(await AsyncStorage.getItem("cart")) || [];
      const localStorageCartProductIds = localStorageCart.map(
        (item) => item.productId
      );

      if (cartItems?.data?.data?.length) {
        const fetchedCart = cartItems.data.data;
        const fetchedProductIds = fetchedCart.map((item) => item.productId._id);

        const uniqueLocalItems = localStorageCart.filter(
          (localItem) => !fetchedProductIds.includes(localItem.productId)
        );

        const totalCartCount = fetchedCart.length + uniqueLocalItems.length;
        setCartCount(totalCartCount);

        const fetchedQuantitySum = fetchedCart.reduce(
          (sum, item) => sum + (item.quantity || 1),
          0
        );
        const localQuantitySum = localStorageCart.reduce(
          (sum, item) => sum + (item.quantity || 1),
          0
        );

        setInitialLength(fetchedQuantitySum);
      } else {
        setCartCount(localStorageCart.length);
        const localQuantitySum = localStorageCart.reduce(
          (sum, item) => sum + (item.quantity || 1),
          0
        );
        setInitialLength(localQuantitySum);
      }
    };

    updateCartCount();
  }, [cartItems, isChanged]);

  // Effect to monitor network connectivity
  useEffect(() => {
    productRefetch();
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    // Cleanup the listener on unmount
    return () => unsubscribe();
  }, []);

  // Handle clearing cart
  const handleClearCart = useCallback(async () => {
    const localStorageCart =
      JSON.parse(await AsyncStorage.getItem("cart")) || [];
    const productsData = products?.data?.data;
    if (productsData) {
      localStorageCart.forEach((cartItem) => {
        const product = productsData.find((p) => p._id === cartItem.productId);
        if (product) {
          product.stock += cartItem.quantity;
        }
      });
    }

    await AsyncStorage.removeItem("cart");
    setIsChanged(false);
    await clearCartMutation.mutateAsync();
  }, [products, clearCartMutation]);

  // Loading and error states
  if (productsLoading || cartLoading) {
    return <LoadingComp />;
  }

  if (productsError || cartError) {
    return <Text>Error: {productsError?.message || cartError?.message}</Text>;
  }

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
          onPress={()=>setRoute("findserial")}
          // onPress={() => router.navigate("/tryouts")}
          style={styles.logoContainer}
        >
          <Image
            source={{ uri: "https://files.catbox.moe/xw6iaj.png" }}
            style={styles.logo}
          />
          <Text style={styles.title}>Vending</Text>
        </TouchableOpacity>
        <View style={styles.navButtons}>
          {(cartItems?.data?.data?.length > 0 || isChanged) && (
            <TouchableOpacity
              onPress={handleClearCart}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
          {/* <Link href="/carts" style={styles.cartButton}> */}
          <TouchableOpacity onPress={() => setRoute("carts")} style={{padding: 8}}>
            <Image
              source={{ uri: "https://files.catbox.moe/qb07e6.png" }}
              style={styles.cartIcon}
            />
            {(cartItems?.data?.data?.length > 0 || isChanged) && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* </Link> */}
        </View>
      </View>

      <View style={{flexDirection: "row", alignItems: "center", width: "100%", justifyContent: "center", backgroundColor: "red", gap: 10, marginBottom: 10, padding: 10}}>
          <Text style={{color: "white", fontSize: 16, fontWeight: "bold"}}>30% discount on Wai Wai Chicken Masala no. 30</Text>
      </View>

      {/* Category buttons for filtering products */}
      {/* <CategoryButtons
        categories={categories}
        onCategorySelect={setCategory}
        activeCategory={category}
      /> */}

      {/* Product list using FlashList for better performance */}
      <FlashList
        data={filteredProducts}
        renderItem={renderProductItem}
        estimatedItemSize={200}
        numColumns={columns}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.productList}
        windowSize={3}
      />

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
    backgroundColor: "white",
    padding: 0,
    margin: 0,
  },
  offlineBanner: {
    backgroundColor: "#dc2626", // Red color
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    width: "100%",
    zIndex: 1000,
  },
  offlineText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#e5e7eb",
    padding: 16,
    marginBottom: 8
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  navButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  clearButton: {
    backgroundColor: "#f97316",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 16,
  },
  clearButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  cartButton: {
    position: "relative",
  },
  cartIcon: {
    width: 32,
    height: 32,
  },
  cartBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#dc2626",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  productItem: {
    margin: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  productItem: {
    width: productWidth,
    marginBottom: 16,
  },
  scrollTopButton: {
    position: "absolute",
    bottom: 80,
    right: 16,
    backgroundColor: "rgba(156, 163, 175, 0.4)",
    borderRadius: 30,
    padding: 12,
  },
  keypadButton: {
    position: "fixed",
    width: 60,
    alignItems: "center",
    zIndex: 100,
    bottom: 16,
    right: 16,
    backgroundColor: "#f97316",
    borderRadius: 30,
    padding: 12,
  },
  keypadIcon: {
    width: 32,
    height: 32,
  },
  textBarContainer: {
    fontSize: 32,
    textAlign: "center",
    fontWeight: "bold",
  },
  clearKeypadButton: {
    padding: 16,
  },
  clearKeypadButtonText: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
  },
  textBar: {
    borderWidth: 1,
    borderColor: "#aaa",
    padding: 12,
    backgroundColor: "#ddd",
    flex: 1,
    alignItems: "center",
  },
  textBarText: {
    fontSize: 32,
    color: "#333",
  },
  input: {
    position: "absolute",
    button: 0,
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    width: "80%",
    paddingLeft: 10,
  },
});

// Memoize the entire component
export default memo(VendingMachine);
