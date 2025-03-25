import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RES_CARD_IMG_CDN_URL } from "../../../helpers/Constant";
import { useDispatch, useSelector } from 'react-redux';
import { addItems, removeItems } from '../../../Utils/cartSlice';

/**
 * Professional food item card with Swiggy-inspired design
 * Features enhanced error handling, normalized data and clean UI elements
 */
const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const cartItems = useSelector((store) => store.cart.cartItems);
  const [isPresent, setIsPresent] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [addBtnAnimation, setAddBtnAnimation] = useState(false);

  // Swiggy color constants
  const SWIGGY_ORANGE = "#FC8019";
  const SWIGGY_DARK_GRAY = "#3D4152";
  const SWIGGY_LIGHT_GRAY = "#686B78";
  
  // Handle adding item to cart
  const handleAddItem = () => {
    const itemToAdd = {
      id: product.id || `product-${Date.now()}`,
      name: normalizedProduct.name,
      isVeg: normalizedProduct.isVeg,
      price: parseFloat(normalizedProduct.price) || 0,
      defaultPrice: parseFloat(normalizedProduct.price) || 0,
      resDetailsData: {
        id: normalizedProduct.restaurant_id,
        name: normalizedProduct.restaurant_name,
        cloudinaryImageId: normalizedProduct.image_url
      }
    };
    
    // Add animation effect when adding to cart
    setAddBtnAnimation(true);
    setTimeout(() => setAddBtnAnimation(false), 300);
    
    dispatch(addItems(itemToAdd));
  };
  
  // Handle removing item from cart
  const handleRemoveItem = () => {
    const itemToRemove = {
      id: product.id || `product-${Date.now()}`,
      name: normalizedProduct.name,
      isVeg: normalizedProduct.isVeg,
      price: parseFloat(normalizedProduct.price) || 0,
      defaultPrice: parseFloat(normalizedProduct.price) || 0
    };
    
    dispatch(removeItems(itemToRemove));
  };
  
  // Check if item exists in cart and get quantity
  useEffect(() => {
    const existingItemIndex = cartItems.findIndex((item) => {
      return item.id === (product.id || `product-${Date.now()}`);
    });
    
    setIsPresent(existingItemIndex >= 0);
    setQuantity(existingItemIndex >= 0 ? cartItems[existingItemIndex].quantity : 0);
  }, [cartItems, product.id]);
  
  // Normalize product data to handle different structures
  const normalizedProduct = useMemo(() => {
    console.log("[ProductCard] Received product data:", product);
    
    // Handle null/undefined
    if (!product) {
      console.error("[ProductCard] Received null/undefined product data");
      return {
        name: "Product information unavailable",
        description: "No description available",
        price: "N/A",
        restaurant_name: "Unknown restaurant",
        image_url: null,
        isVeg: false
      };
    }
    
    // Create a normalized data object with defaults
    return {
      name: product.name || product.item_name || "Unnamed Product",
      description: product.description || "No description available",
      price: product.price || product.cost || "N/A",
      restaurant_name: product.restaurant_name || product.restaurantName || "",
      restaurant_id: product.restaurant_id || product.restaurantId || "",
      category: product.category || "",
      image_url: product.image_url || product.imageId || null,
      isVeg: product.isVeg || product.is_veg || false,
      rating: product.rating || null,
      timeToPrep: product.timeToPrep || product.prep_time || null
    };
  }, [product]);

  // Safely convert price to number and format it
  const formatPrice = (price) => {
    if (typeof price === 'number') {
      return price.toFixed(2);
    } else if (typeof price === 'string') {
      const numPrice = parseFloat(price.replace(/[^\d.]/g, ''));
      return isNaN(numPrice) ? "N/A" : numPrice.toFixed(2);
    }
    return "N/A";
  };

  return (
    <motion.div 
      className="relative w-full rounded-xl mb-4 shadow-lg overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ 
        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
        y: -3
      }}
    >
      {/* Background image with gradient overlay */}
      {normalizedProduct.image_url && (
        <div className="absolute inset-0 w-full h-full z-0">
          <img 
            src={normalizedProduct.image_url.startsWith('http') 
              ? normalizedProduct.image_url 
              : RES_CARD_IMG_CDN_URL + normalizedProduct.image_url} 
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/400?text=Food';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent opacity-80"></div>
        </div>
      )}

      {/* Content overlay */}
      <div className="relative z-10 p-5 pt-40">
        {/* Veg/Non-veg indicator */}
        <div 
          className={`absolute top-3 left-3 w-5 h-5 border border-white ${
            normalizedProduct.isVeg ? 'bg-green-50' : 'bg-red-50'
          } flex items-center justify-center shadow-sm rounded-sm`}
        >
          <div 
            className={`w-2.5 h-2.5 rounded-full ${
              normalizedProduct.isVeg ? 'bg-green-500' : 'bg-red-500'
            }`}
          ></div>
        </div>
        
        {/* Rating badge at top right */}
        {normalizedProduct.rating && (
          <div className="absolute top-3 right-3 flex items-center bg-white px-2 py-1 rounded text-xs shadow-sm">
            <svg className="w-3 h-3 text-yellow-500 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-medium">{normalizedProduct.rating}</span>
          </div>
        )}
        
        {/* Product details */}
        <div>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-bold text-white text-xl line-clamp-1">{normalizedProduct.name}</h3>
              
              {normalizedProduct.category && (
                <p className="text-xs text-gray-300 mt-1">
                  {normalizedProduct.category}
                </p>
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-200 line-clamp-2 mt-2 mb-3">
            {normalizedProduct.description}
          </p>
          
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center">
              {normalizedProduct.restaurant_name && (
                <div className="text-xs text-gray-300 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {normalizedProduct.restaurant_name}
                </div>
              )}
            </div>
            
            <div className="font-bold text-white text-lg">
              ₹{formatPrice(normalizedProduct.price)}
            </div>
          </div>
          
          {/* Add to cart button or Quantity selector */}
          {!isPresent || quantity <= 0 ? (
            <motion.button 
              className="mt-3 w-full py-2 rounded-md text-sm font-medium flex items-center justify-center"
              style={{ 
                backgroundColor: SWIGGY_ORANGE,
                color: 'white'
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              animate={addBtnAnimation ? { scale: [1, 1.15, 1] } : {}}
              onClick={handleAddItem}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              ADD
            </motion.button>
          ) : (
            <div className="mt-3 flex items-center justify-between text-sm rounded-md overflow-hidden shadow-sm border border-gray-100">
              <motion.button
                className="px-4 py-2 bg-white text-[#60b246] font-semibold"
                whileTap={{ scale: 0.95 }}
                onClick={handleRemoveItem}
              >
                -
              </motion.button>
              <span className="px-4 py-2 bg-white font-semibold text-gray-800">{quantity}</span>
              <motion.button
                className="px-4 py-2 bg-white text-[#60b246] font-semibold"
                whileTap={{ scale: 0.95 }}
                onClick={handleAddItem}
              >
                +
              </motion.button>
            </div>
          )}
        </div>
      </div>
      
      {/* Preparation time indicator, only show if available */}
      {normalizedProduct.timeToPrep && (
        <div className="mt-3 flex items-center text-xs text-gray-500 border-t border-gray-100 pt-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Preparation time: {normalizedProduct.timeToPrep} mins
        </div>
      )}
    </motion.div>
  );
};

export default ProductCard;
