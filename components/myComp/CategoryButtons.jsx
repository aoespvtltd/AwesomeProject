import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

function CategoryButtons({ categories, onCategorySelect }) {
  const [activeCategory, setActiveCategory] = useState(''); // Default is 'All'
  const all = { name: 'All', slug: 'all' };

  const handleCategorySelect = (slug) => {
    const selectedCategory = slug === 'all' ? '' : slug;
    setActiveCategory(selectedCategory); // Update active category state
    if (onCategorySelect) onCategorySelect(selectedCategory); // Trigger the callback
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {[all, ...categories].map((category, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleCategorySelect(category.slug)}
            style={[
              styles.buttonContent,
              activeCategory === category.slug || (activeCategory === '' && category.slug === 'all')
                ? styles.activeButton
                : styles.inactiveButton,
            ]}
          >
            <Text style={styles.buttonLabel}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50, // Adjust this value as needed
    marginVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'lightgray',
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    gap:12,
  },
  buttonContent: {
    height: 40, // Ensures consistent height
    minWidth:80,
    fontSize:16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  activeButton: {
    backgroundColor: '#ff6600', // Orange for active
    // backgroundColor: 'green', // Orange for active
  },
  inactiveButton: {
    backgroundColor: '#95979b', // Gray for inactive
  },
  buttonLabel: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16, // Adjust font size if needed
  },
});

export default CategoryButtons;
