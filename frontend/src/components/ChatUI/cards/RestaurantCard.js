import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Professional restaurant card with Swiggy-inspired design
 * Features expandable details and consistent styling
 */
const RestaurantCard = ({ restaurant }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Swiggy color constants
  const SWIGGY_ORANGE = "#FC8019";
  const SWIGGY_DARK_GRAY = "#3D4152";
  const SWIGGY_LIGHT_GRAY = "#686B78";
  const SWIGGY_BG_LIGHT = "#F1F1F6";
  
  // Data normalization to handle different structures with robust error handling
  const normalizedRestaurant = useMemo(() => {
    console.log("[RestaurantCard] Received restaurant data:", restaurant);
    
    // Handle null/undefined
    if (!restaurant) {
      console.error("[RestaurantCard] Received null/undefined restaurant data");
      return {
        name: "Restaurant information unavailable",
        rating: "N/A",
        cuisines: [],
        cuisine: "Not specified",
        delivery_time: "30-45 min",
        image_url: null,
        price_range: "₹200",
        address: "",
        distance: "",
        popular_items: []
      };
    }
    
    // Create a normalized data object with defaults
    const cuisinesArray = restaurant.cuisines 
      ? (Array.isArray(restaurant.cuisines) ? restaurant.cuisines : restaurant.cuisines.split(',').map(c => c.trim()))
      : [];
      
    const popularItems = restaurant.popular_items
      ? (Array.isArray(restaurant.popular_items) ? restaurant.popular_items : restaurant.popular_items.split(',').map(i => i.trim()))
      : [];
      
    return {
      name: restaurant.name || restaurant.restaurant_name || "Unnamed Restaurant",
      rating: restaurant.rating || restaurant.avgRating || "N/A",
      cuisines: cuisinesArray,
      cuisine: cuisinesArray.join(", ") || restaurant.cuisine || "Various",
      delivery_time: restaurant.delivery_time || restaurant.deliveryTime || "30-45 min",
      address: restaurant.address || restaurant.location || "",
      distance: restaurant.distance || "",
      image_url: restaurant.image_url || restaurant.cloudinaryImageId || null,
      popular_items: popularItems,
      price_range: restaurant.price_range || restaurant.costForTwo || "₹200",
      offers: restaurant.offers || [],
      isNew: restaurant.isNew || false,
      promoted: restaurant.promoted || false
    };
  }, [restaurant]);
  
  // Rating display helpers - Swiggy style ratings
  const getRatingStyle = (rating) => {
    const ratingNum = parseFloat(rating);
    if (isNaN(ratingNum)) return { color: "#BCBCBC", bgColor: "#F3F3F3" };
    if (ratingNum >= 4.0) return { color: "#FFFFFF", bgColor: "#48C479" }; // Green
    if (ratingNum >= 3.0) return { color: "#FFFFFF", bgColor: "#DB7C38" }; // Amber
    return { color: "#FFFFFF", bgColor: "#E1B055" }; // Orange
  };

  const ratingStyle = getRatingStyle(normalizedRestaurant.rating);

  // Price range display - Swiggy style
  const getPriceRangeText = (priceRange) => {
    if (!priceRange) return "₹200 for two";
    if (typeof priceRange === 'string' && priceRange.includes('₹')) return priceRange;
    return `₹${priceRange} for two`;
  };

  return (
    <motion.div 
      className="bg-white rounded-lg mb-4 overflow-hidden shadow-md border border-gray-100"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}
    >
      {/* Main content */}
      <div className="p-4 flex">
        {/* Restaurant image */}
        {normalizedRestaurant.image_url && (
          <div className="relative mr-4 flex-shrink-0">
            <img 
              src={normalizedRestaurant.image_url.startsWith('http') 
                ? normalizedRestaurant.image_url 
                : `https://res.cloudinary.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_508,h_320,c_fill/${normalizedRestaurant.image_url}`} 
              alt={normalizedRestaurant.name} 
              className="w-24 h-24 object-cover rounded-md border border-gray-100"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/100?text=Restaurant';
              }}
            />
            
            {/* Quick View badge */}
            {normalizedRestaurant.isNew && (
              <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs py-0.5 px-2">
                NEW
              </div>
            )}
          </div>
        )}

        {/* Restaurant details */}
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-800">{normalizedRestaurant.name}</h3>
          
          <div className="flex items-center mt-1">
            {/* Rating pill */}
            <span 
              className="text-xs font-semibold px-1.5 py-0.5 rounded flex items-center" 
              style={{ 
                backgroundColor: ratingStyle.bgColor,
                color: ratingStyle.color
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {normalizedRestaurant.rating}
            </span>
            
            <span className="mx-2 text-gray-400">•</span>
            
            <span className="text-sm text-gray-600">{normalizedRestaurant.delivery_time}</span>
            
            <span className="mx-2 text-gray-400">•</span>
            
            <span className="text-sm text-gray-600">{getPriceRangeText(normalizedRestaurant.price_range)}</span>
          </div>
          
          {/* Cuisines */}
          <div className="mt-1 text-sm text-gray-500 line-clamp-1">
            {normalizedRestaurant.cuisine}
          </div>
          
          {/* Distance */}
          <div className="flex items-center mt-2 text-sm text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {normalizedRestaurant.distance ? `${normalizedRestaurant.distance} km away` : 'Nearby'}
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-between items-center mt-3">
            <motion.button 
              className="text-white px-4 py-1.5 rounded-md text-sm font-medium flex items-center justify-center"
              style={{ backgroundColor: SWIGGY_ORANGE }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => console.log('View restaurant:', restaurant)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              View Menu
            </motion.button>
            
            <motion.button 
              className="border border-gray-300 text-gray-700 rounded-md p-2"
              whileHover={{ 
                scale: 1.05,
                backgroundColor: "#f8f8f8"
              }}
              animate={{ 
                rotate: expanded ? 180 : 0,
              }}
              onClick={() => setExpanded(!expanded)}
              aria-label="Toggle details"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>
      
      {/* Expandable details section */}
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              {/* Popular items section */}
              {normalizedRestaurant.popular_items && normalizedRestaurant.popular_items.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center">
                    <span style={{ color: SWIGGY_ORANGE }}>★</span>
                    <span className="ml-1">Popular Items</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {normalizedRestaurant.popular_items.map((item, idx) => (
                      <span 
                        key={idx}
                        className="inline-block px-2.5 py-1 bg-white rounded-full text-xs text-gray-700 border border-gray-200"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Address section */}
              <div className="mt-2">
                <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: SWIGGY_ORANGE }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Address
                </h4>
                <p className="text-sm text-gray-700 bg-white p-2.5 rounded-md border border-gray-100">
                  {normalizedRestaurant.address || 'Address information unavailable'}
                </p>
              </div>

              {/* Offers section if available */}
              {normalizedRestaurant.offers && normalizedRestaurant.offers.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: SWIGGY_ORANGE }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    Offers & Deals
                  </h4>
                  <div className="space-y-2">
                    {normalizedRestaurant.offers.map((offer, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center bg-white p-2 rounded-md border-l-4 border-yellow-500"
                      >
                        <div className="p-1.5 rounded-full mr-2" style={{ color: SWIGGY_ORANGE }}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-700">{offer.description || offer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RestaurantCard;
