import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Professional food item card with Swiggy-inspired design
 * Features enhanced error handling, normalized data and clean UI elements
 */
const ProductCard = ({ product }) => {
  // Swiggy color constants
  const SWIGGY_ORANGE = "#FC8019";
  const SWIGGY_DARK_GRAY = "#3D4152";
  const SWIGGY_LIGHT_GRAY = "#686B78";
  
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
      className="bg-white rounded-lg p-4 mb-4 border border-gray-100 shadow-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ 
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div className="flex">
        {/* Food image */}
        {normalizedProduct.image_url && (
          <div className="relative mr-4 flex-shrink-0">
            <div className="w-24 h-24 rounded-md overflow-hidden">
              <img 
                src={normalizedProduct.image_url.startsWith('http') 
                  ? normalizedProduct.image_url 
                  : `https://res.cloudinary.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_508,h_320,c_fill/${normalizedProduct.image_url}`} 
                alt={normalizedProduct.name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/100?text=Food';
                }}
              />
            </div>
            
            {/* Veg/Non-veg indicator */}
            <div 
              className={`absolute -top-1 -left-1 w-4 h-4 border border-gray-200 ${
                normalizedProduct.isVeg ? 'bg-green-50' : 'bg-red-50'
              } flex items-center justify-center`}
            >
              <div 
                className={`w-2 h-2 rounded-full ${
                  normalizedProduct.isVeg ? 'bg-green-500' : 'bg-red-500'
                }`}
              ></div>
            </div>
          </div>
        )}
        
        {/* Product details */}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 line-clamp-1">{normalizedProduct.name}</h3>
              
              {normalizedProduct.category && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {normalizedProduct.category}
                </p>
              )}
            </div>
            
            {normalizedProduct.rating && (
              <div className="flex items-center bg-gray-50 px-2 py-1 rounded text-xs">
                <svg className="w-3 h-3 text-yellow-500 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium">{normalizedProduct.rating}</span>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-600 line-clamp-2 mt-1.5 mb-2">
            {normalizedProduct.description}
          </p>
          
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center">
              {normalizedProduct.restaurant_name && (
                <div className="text-xs text-gray-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {normalizedProduct.restaurant_name}
                </div>
              )}
            </div>
            
            <div className="font-bold" style={{ color: SWIGGY_DARK_GRAY }}>
              ₹{formatPrice(normalizedProduct.price)}
            </div>
          </div>
          
          {/* Add to cart button */}
          <motion.button 
            className="mt-3 w-full py-2 rounded-md text-sm font-medium flex items-center justify-center"
            style={{ 
              backgroundColor: SWIGGY_ORANGE,
              color: 'white'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => console.log('Add to cart:', product)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            ADD
          </motion.button>
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
