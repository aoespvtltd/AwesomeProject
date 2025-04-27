import { View, Text, StyleSheet, Dimensions, FlatList } from 'react-native';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../../components/api/api';
import ProductCard from '../../../components/myComp/ProductCardNtng';
import LoadingComp from '../../../components/myComp/LoadingComp';
import { FlashList } from '@shopify/flash-list';
import CategoryButtons from '../../../components/myComp/CategoryButtons';
import { categories } from '../../../components/api/categories';
const { width } = Dimensions.get("window");
const ITEM_WIDTH = width / 2 - 16; // Two columns with spacing

export default function Home3() {
  const[filteredProducts, setFilteredProducts] = useState([]);

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const products = await getProducts();
      setFilteredProducts(products?.data?.data);
      return products;
    }
  });

  const handleCategorySelect = (category) => {
    if (category === '') {
      setFilteredProducts(products?.data?.data);
    } else {
      setFilteredProducts(products?.data?.data.filter((product) => product.category === category));
    }
  };


  if (isLoading) return <LoadingComp />;
  if (error) return <Text style={styles.errorText}>Error: {error.message}</Text>;

  return (
    <View style={styles.container}>
      <CategoryButtons categories={categories} onCategorySelect={handleCategorySelect} />
      {/* <FlatList
        data={filteredProducts.sort((a, b) => a.productNumber - b.productNumber) || []}
        renderItem={({ item }) => <ProductCard product={item} />}
        keyExtractor={(item) => item._id.toString()}
        numColumns={2} // Two-column grid
        estimatedItemSize={200} // Adjust based on item height
        contentContainerStyle={styles.listContainer}
      /> */}
      {filteredProducts?.sort((a, b) => a.productNumber - b.productNumber).map((item) => (
        <ProductCard product={item} key={item._id} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Light background
    paddingHorizontal: 8,
  },
  listContainer: {
    paddingVertical: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});

