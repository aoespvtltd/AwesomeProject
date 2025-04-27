// src/components/MainContent.jsx
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "../../components/ProductCard";
import KeypadModal from "../../components/KeypadModal";
import CategoryButtons from "../../components/CategoryButtons";
import KeyPad from "../../assets/keyPad.png";
import { getCartItems, getProducts } from "../../api/api";

function MainContent() {
  const [category, setCategory] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const machineId = localStorage.getItem("machineId");

  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({ queryKey: ["products"], queryFn: () => getProducts() });

  const {
    data: cartItems,
    isLoading: cartLoading,
    error: cartError,
  } = useQuery({ queryKey: ["cartItems", machineId], queryFn: getCartItems });

  useEffect(() => {
    if (products) {
      setFilteredProducts(filterProducts(products.data.data, category));
    }
  }, [products, category]);

  const openKeypad = () => {
    setShowModal(true);
  };

  const closeKeypad = () => {
    setShowModal(false);
  };

  const sortByCat = (myCategory) => {
    setCategory(myCategory);
    setFilteredProducts(filterProducts(products.data.data, myCategory));
  };

  const filterProducts = (products, category) => {
    return category === ""
      ? products
      : products.filter((product) => product.category === category);
  };

  const filterProductsByProductNumber = (number) => {
    setInputValue(number);
    setFilteredProducts(
      products?.data?.data.filter((product) =>
        product.productNumber.toString().includes(number)
      )
    );
  };

  return (
    <div className="bg-white items-center justify-center">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {productsLoading || cartLoading ? (
          <div>Loading...</div>
        ) : productsError || cartError ? (
          <div>Error loading data</div>
        ) : (
          <div
            id="product-container"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-16"
          >
            {filteredProducts?.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                myCart={cartItems.data.data}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className="fixed bottom-4 right-4 rounded-full px-3 pt-3 pb-2 bg-orange-400 cursor-pointer"
        onClick={openKeypad}
      >
        <img src={KeyPad} alt="Keypad" className="h-8 w-8" />
      </div>

      {showModal && (
        <KeypadModal
          inputValue={inputValue}
          onInputChange={filterProductsByProductNumber}
          onClose={closeKeypad}
          className={showModal ? "show" : "hide"}
          productLength={filteredProducts?.length}
        />
      )}
    </div>
  );
}

export default MainContent;
