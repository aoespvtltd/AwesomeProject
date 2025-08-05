import axios from 'axios';
import {baseURL} from '../../src/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// export let machineId = AsyncStorage.getItem("machineId") || "66d80057da82f664156f58b0";

export let machineId = "";

export async function getMachineId(){
  try {
    machineId = await AsyncStorage.getItem("machineId");
    console.log('Machine ID from API:', machineId);
    if (!machineId){
      machineId = "66d72290ee1e0a2dabce6069";
    }
    return machineId;
  } catch (error) {
    console.error('Error getting machine ID:', error);
    machineId = "66d72290ee1e0a2dabce6069";
    return machineId;
  }
}

getMachineId();

const apiClient = axios.create({
  baseURL,
  timeout: 10000, // 10 second timeout
});

apiClient.interceptors.request.use(async (req) => {
  try {
    const accessToken = await AsyncStorage.getItem('accessToken');
    
    if (accessToken) {
      req.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      console.log("No access token found, proceeding without authentication");
    }
    
    return req;
  } catch (error) {
    console.error('Error in request interceptor:', error);
    return req;
  }
}, error => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

// Add response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('Authentication error - user may need to login');
      // Don't throw error, just log it
    } else if (error.response?.status === 404) {
      console.log('Resource not found:', error.config?.url);
      // Don't throw error, just log it
    }
    return Promise.reject(error);
  }
);

// Cart Operations
export const addToCart = async productId => {
  let cartData = {};
  cartData.machineId = machineId; // Ensure machineId is included
  return await apiClient.post(`/carts/${productId}`, cartData);
};

// export const addAllToCart = async () => {
//   const cart = JSON.parse(localStorage.getItem('cart')) || [];

//   if (!cart.length || !machineId) {
//     return;
//   }

//   return  await apiClient.post('/carts/allToCart', {
//       machineId,
//       cartItems: cart,
//     });
// };

export const addToCartByPN = async productNumber => {
  let cartData = {};
  productNumber = parseInt(productNumber);
  cartData.machineId = machineId; // Ensure machineId is included
  console.log(
    `${baseURL}/carts/productNumber/${productNumber}/?machineId=${machineId}`,
  );
  // return await apiClient.post(`/carts/productNumber/${productNumber}/?machineId=${machineId}`, cartData);
  return await apiClient.post(
    `/carts/productNumber/${productNumber}/?machineId=${machineId}`,
  );
};

export const getCartItems = async () => {
  return await apiClient.get(`/carts?machineId=${machineId}`); // Include machineId in the request
};

export const removeCartItem = async cartItemId => {
  return await apiClient.delete(`/carts/${cartItemId}?machineId=${machineId}`); // Include machineId in the request
};

export const clearCart = async () => {
  return await apiClient.delete(`/carts/${machineId}/clear`);
};

export const getUnpaidCartsByMachine = async () => {
  return await apiClient.get(`/carts/unpaid?machineId=${machineId}`); // Include machineId in the request
};

export const getCartLength = async () => {
  return await apiClient.get(`/carts/cartlength?machineId=${machineId}`);
};

export const getPaidCartsByMachine = async machineIdy => {
  return await apiClient.get(`/carts/paid/${machineIdy}`); // Include machineId in the request
};

export const updateCartItem = async (cartItemId, quantity) => {
  return await apiClient.patch(`/carts/${cartItemId}`, {quantity});
};

// Payment Operations
export const initiatePayment = async () => {
  let paymentData = {};
  paymentData.machineId = machineId; // Ensure machineId is included
  return await apiClient.post('/payments/', {machineId});
};

export const finalizePayment = async () => {
  // paymentData.machineId = machineId; // Ensure machineId is included
  return await apiClient.post('/payments/finalize', {machineId});
};

// Product Operations

export const getProducts = async (machineIdy = machineId) => {
  return await apiClient.get(`/products?machineId=${machineIdy}`); // Include machineId in the request
};

export const fillStock = async productId => {
  return await apiClient.post(`/products/fillStock/${productId}`, {});
};

export const updateProduct = async (productId, newVal) => {
  console.log(newVal);
  return await apiClient.patch(`/products/${productId}`, {stock: newVal});
};

export const loginUser = async userData => {
  const res = await apiClient.post('/users/login', userData);
  await AsyncStorage.setItem('accessToken', res.data.data.accessToken);
  await AsyncStorage.setItem('refreshToken', res.data.data.refreshToken);
  await AsyncStorage.setItem("codes", JSON.stringify(res.data.data.user.codes))
  return res;
};

const accessToken = AsyncStorage.getItem('accessToken') || null;

export const getVendingMachinesByOwner = async () => {
  return await apiClient.get(`/vending-machines/owner`, {
    headers: {Authorization: `Bearer ${accessToken}`},
  }); // Include machineId in the request
};

export const updateVendingMachine = async (machineId, data)=>{
  return await apiClient.patch(`/vending-machines/${machineId}`, data)
}

export const getMachineDetails = async (machineId) =>{
  return await apiClient.get(`/vending-machines/${machineId}`)
}

export const getMachineLocation = async (machineId)=>{
  return await apiClient.get(`/vending-machines/location/${machineId}`)
}

export const uploadMachineLocation = async (machineId, data)=>{
  return await apiClient.patch(`/vending-machines/location/${machineId}`, data)
}

export const getOffer = async () =>{
  return await apiClient.get(`/offer/machine/${machineId}`)
}

export const generateNepalPayQR = async ()=>{
  return await apiClient.post("/payments/initNepalPay", {machineId: machineId})
}

export const initiateNepalPay = async ()=>{
  return await apiClient.post("/payments/initNepalPay", {machineId: machineId})
}

export const getFonePayDetails = async ()=>{
  return apiClient.get("/users/fonePayDetails").then((res)=> res).catch(err=>console.error("err", err))
}

export const downloadApp = async ()=>{
  return await apiClient.get("/appVersion/downloadApp")
}

export const getappVersion = async() => {
  return await apiClient.get("/appVersion/one")
} 

export const checkForUpdate = async (appName, version)=>{
  return await apiClient.post(`/appVersion/checkForUpdates`, {appName, version})
}

export const getCodes = async ()=>{
  return await apiClient.get("/users/codes")
}

export const hasWhatPayments = async ()=>{
  return await apiClient.get("/users/hasWhatPayments")
}