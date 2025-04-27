import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeCartItem, updateCartItem } from "../api/api";
import React, { useEffect, useState } from "react";
import DialogBox from "./DialogBox";

const CartItemOnClick = ({ product, cartsLoading, cartItems }) => {
  // Safeguard against null or undefined productId
  // const [product, setProduct] = useState(myProduct ? myProduct : {})
  const initialStock = product?.productId?.stock || 0;
  const initialQuantity = product?.quantity || 0;
  const [isDialogOpen, setIsDialogOpen] = useState(false); // State for dialog visibility
  const [quantity, setQuantity] = useState(initialQuantity);
  const [hasChanged, setHasChanged] = useState(false);
  const queryClient = useQueryClient();
  
  // Handle quantity change
  const changeQuantity = async (change) => {
    await updateMutation.mutate()
    const newQuantity = quantity + change;

    if (change===1){
      let sum = 0
      cartItems.forEach(cart=>{
        sum+=cart.quantity
      })
      if (sum + quantity - initialQuantity >= 5){
        setIsDialogOpen(true)
        return 0
      }
    }
  console.log(quantity)
    // Only allow quantity changes within the valid range
    if (newQuantity > 0 && newQuantity <= initialStock + initialQuantity) {
      setQuantity(newQuantity);
      console.log('Stock:', initialStock - newQuantity, 'Quantity:', newQuantity);
      // setHasChanged(true);
    }else{
      alert("Item no longer in stock.")
    }

  };

  useEffect(()=>{
    return ()=>{
      console.log(product)
    }
  },[])
  
  // Mutation for updating the cart item
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (quantity > 0){
        let sum = 0
        cartItems.forEach(cart=>{
          sum+=cart.quantity
        })
        if (sum + quantity - initialQuantity > 5){
          alert("Items quantity cannot exceed 5.")
          setQuantity(initialQuantity)
          return 0
        }
      }
      const res = await updateCartItem(product._id, quantity);
      return res;
    },
    onSuccess: async () => {
      setHasChanged(false);
      await queryClient.invalidateQueries(['cartItems']); // Refetch cart data after update
    },
    onError: (error) => {
      console.error("Error updating cart item:", error);
    },
  });

  // Mutation for removing the cart item
  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await removeCartItem(product._id);
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['cartItems']); // Refetch cart data after removal
    },
    onError: (error) => {
      console.error("Error removing cart item:", error);
    },
  });

  if (!product || !product.productId) {
    return <li className="flex py-6">Invalid product data</li>;
  }

  {console.log(cartsLoading)}
  if (cartsLoading) return <h1>Loading...</h1>
  {console.log(product)}
  return (
    <li className="flex py-6">
      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
        <img
          alt={product.productId.name}
          src={product.productId.image_url}
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="ml-4 flex flex-1 flex-col">
        <div>
          <div className="flex justify-between text-base font-medium text-gray-900">
            <h3>
              <a href="#">{product.productId.name}</a>
            </h3>
            <p className="ml-4">Rs. {product.productId.price * quantity}</p>
          </div>
        </div>
        <div className="flex flex-1 items-end justify-between text-sm">
          <p className="text-gray-500">Qty {quantity}</p>
          <div className="flex pl-8">
            <button
              className="cursor-pointer px-3 py-1 text-2xl rounded-full mx-3"
              onClick={() => changeQuantity(1)}
            >
              +
            </button>
            <button
              className="cursor-pointer px-3 py-1 text-2xl rounded-full mx-3"
              onClick={() => changeQuantity(-1)}
            >
              -
            </button>
          </div>
          <div className="flex">
            <button
              type="button"
              className={`font-medium text-indigo-600 hover:text-indigo-500 ${!hasChanged && 'hidden'}`}
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isLoading}
            >
              {updateMutation.isLoading ? "Updating..." : "Update"}
            </button>
            <button
              type="button"
              className={`font-medium text-red-600 hover:text-red-500 ml-4 ${removeMutation.isLoading ? "cursor-not-allowed" : ""}`}
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isLoading}
            >
              {removeMutation.isLoading ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      </div>
      <DialogBox isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen}/>
    </li>
  );
};

export default CartItemOnClick;
