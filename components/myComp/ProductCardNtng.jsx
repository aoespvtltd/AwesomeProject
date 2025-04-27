import React from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native'

const ProductCard = ({product}) => {
  console.log(product.productNumber)
  const addtocart = ()=>{
    console.log("added to cart")
  }
  return (
    <ScrollView style={{ backgroundColor: 'red', marginBottom: 80}}>
        {/* <Image source={{uri: product.image_url}} style={{width: 100, height: 100}} /> */}
        <Text>{product.productNumber}</Text>
        <Text>{product.name}</Text>
        <Text>{product.price}</Text>
        <Text>{product.stock}</Text>
        <Text>{product.category}</Text>
        {/* <TouchableOpacity onPress={addtocart}><Text>Add to Cart</Text></TouchableOpacity> */}
      <Text>Product Card</Text>
    </ScrollView>
  )
}

export default ProductCard