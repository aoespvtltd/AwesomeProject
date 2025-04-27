import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

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
          <Button
            key={index}
            onPress={() => handleCategorySelect(category.slug)}
            mode="text"
            contentStyle={[
              styles.buttonContent,
              activeCategory === category.slug || (activeCategory === '' && category.slug === 'all')
                ? styles.activeButton // Active button styling
                : styles.inactiveButton, // Inactive button styling
            ]}
            labelStyle={styles.buttonLabel}
          >
            {category.name}
          </Button>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50, // Adjust this value as needed
    marginVertical: 10,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    gap:12,
  },
  buttonContent: {
    height: 40, // Ensures consistent height
    minWidth:80,
    fontSize:40,
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: '#f97316', // Orange for active
    // backgroundColor: 'green', // Orange for active
  },
  inactiveButton: {
    backgroundColor: '#95979b', // Gray for inactiver
  },
  buttonLabel: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16, // Adjust font size if needed
  },
});

export default CategoryButtons;
