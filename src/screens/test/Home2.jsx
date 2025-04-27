import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
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
import { FlashList } from "@shopify/flash-list";
import { categories } from "../../components/api/categories";
import ProductCard from "../../components/myComp/ProductCard2";
import CategoryButtons from "../../components/myComp/CategoryButtons";
import LoadingComp from "../../components/myComp/LoadingComp";
// import { useRouter } from "expo-router";
import Keypad from "../../components/myComp/Keypad";
import { SafeAreaView } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { columns } from "../constants";
import Video from "react-native-video";

// Move these outside component to prevent recreation
const { width } = Dimensions.get("window");
const productWidth = (width - 18) / columns;

function VendingMachine({route, setRoute}) {
  const [category, setCategory] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [isChanged, setIsChanged] = useState(false);
  const [isKeypadVisible, setIsKeypadVisible] = useState(false);
  // const router = useRouter();

  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
    refetch: productRefetch,
  } = useQuery({
    queryKey: ["products"],
    queryFn: async ()=>{
      const products = await getProducts()
      // console.log(products)
      return products
    },
    staleTime: 10 * 1000,
  });

  const {
    data: cartItems,
    isLoading: cartLoading,
    error: cartError,
    refetch: cartRefetch,
  } = useQuery({
    queryKey: ["cartItems"],
    queryFn: async ()=>{
      const items = await getCartItems()
      // setCartCount(items?.data?.data?.length)
      items.data.data.forEach(item=>{
        setCartCount(prev=>prev+item.quantity)
      })
      return items?.data?.data
    },
    staleTime: 10 * 1000,
  });

  const handleClearCart = useCallback(async () => {
    await clearCartMutation.mutateAsync();
    setIsChanged(false);
  }, [clearCartMutation]);

  const clearCartMutation = useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      setIsChanged(false);
      productRefetch()
      setCartCount(0)
    },
  });

  const filteredProducts = useMemo(() => {
    if (!products?.data?.data) return [];
    
    // Get base products array and sort by productNumber
    let filtered = [...products.data.data].sort((a, b) => 
      parseInt(a.productNumber) - parseInt(b.productNumber)
    );
    
    // If no filters, return sorted array
    if (!category && !inputValue) return filtered;
    
    // Apply category filter if needed
    if (category) {
      filtered = filtered.filter((product) => product.category === category);
    }
    
    // Apply product number filter if needed
    if (inputValue) {
      filtered = filtered.filter(
        (product) => product.productNumber.toString() === inputValue
      );
    }
    
    return filtered;
  }, [products?.data?.data, category, inputValue]);

  const renderProductItem = useCallback(
    ({ item }) => (
      <ProductCard
        product={item}
        refetch={productRefetch}
        setIsChanged={setIsChanged}
        setCartCount={setCartCount}
      />
    ),
    [cartItems, productRefetch, cartRefetch])
  
  if (productsLoading || cartLoading) {
    return <LoadingComp />;
  }

  if (productsError || cartError) {
    return <Text>Error: {productsError?.message || cartError?.message}</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>No Internet Connection</Text>
        </View>
      )}


      <View style={styles.navbar}>
        <TouchableOpacity
          // onPress={() => router.navigate("/tryouts/bgColor")}
          onPress={()=>setRoute("home")}
          // onPress={() => router.navigate("/tryouts")}
          style={styles.logoContainer}
        >
          <Image
            source={{ uri: "https://files.catbox.moe/9ry8ts.png" }}
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

      <CategoryButtons
        categories={categories}
        onCategorySelect={setCategory}
        activeCategory={category}
      />

      <FlashList
        data={filteredProducts}
        renderItem={renderProductItem}
        estimatedItemSize={200}
        numColumns={columns}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.productList}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={30}
      />

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
