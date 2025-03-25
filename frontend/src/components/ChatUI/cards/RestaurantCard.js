import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RES_CARD_IMG_CDN_URL } from "../../../helpers/Constant"

/**
 * Modern restaurant card with enhanced visual styling
 * Features glass-morphism effects and animated elements
 */
const RestaurantCard = ({ restaurant }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Swiggy color constants
  const SWIGGY_ORANGE = "#FC8019";
  const SWIGGY_DARK_GRAY = "#3D4152";
  const SWIGGY_LIGHT_GRAY = "#686B78";
  
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
      className="bg-white rounded-xl mb-4 overflow-hidden shadow-lg glass-panel-enhanced border border-white/10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ 
        y: -5,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        transition: { duration: 0.2 }
      }}
    >
      {/* Main content with horizontal layout */}
      <div className="relative flex">
        {/* Restaurant image with subtle overlay effect */}
        <div className="w-1/3 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 to-transparent z-10" />
          {normalizedRestaurant.image_url ? (
            <img 
              src={normalizedRestaurant.image_url.startsWith('http') 
                ? normalizedRestaurant.image_url 
                : RES_CARD_IMG_CDN_URL + normalizedRestaurant.image_url}
              alt={normalizedRestaurant.name}
              className="w-full h-full object-cover" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/200?text=Restaurant';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 15.9A11.971 11.971 0 0012 4.5C7.022 4.5 3.01 7.6 1.5 12c1.511 4.4 5.522 7.5 10.5 7.5a11.5 11.5 0 002.82-.35M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          )}

          {/* Badges overlay */}
          {normalizedRestaurant.isNew && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full z-20">
              NEW
            </div>
          )}
          
          {normalizedRestaurant.promoted && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded-full z-20">
              PROMOTED
            </div>
          )}
        </div>

        {/* Restaurant details */}
        <div className="w-2/3 p-4 relative">
          {/* Animated robot icon */}
          <div className="absolute -top-2 -right-2">
            <motion.img 
              src="https://img.icons8.com/?size=512&id=M8M9YjBrtUkd&format=png"
              className="w-7 h-7 opacity-70"
              alt="Restaurant Bot"
              animate={{ y: [0, -5, 0] }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
          
          <div className="flex flex-col h-full">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg enhanced-heading mb-1">{normalizedRestaurant.name}</h3>
                
                {/* Rating pill */}
                <span 
                  className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center shadow-sm" 
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
              </div>
              
              {/* Cuisines */}
              <div className="mt-1 text-sm text-gray-500">
                <div className="flex flex-wrap gap-1 mb-1">
                  {normalizedRestaurant.cuisines.slice(0, 3).map((cuisine, index) => (
                    <span 
                      key={index} 
                      className="px-2 py-0.5 bg-slate-50 text-slate-700 rounded-full text-xs"
                    >
                      {cuisine}
                    </span>
                  ))}
                  {normalizedRestaurant.cuisines.length > 3 && (
                    <span className="text-xs text-gray-500">+{normalizedRestaurant.cuisines.length - 3} more</span>
                  )}
                </div>
              </div>
              
              {/* Key info badges */}
              <div className="flex items-center gap-3 mt-2 text-sm">
                <div className="flex items-center text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs">{normalizedRestaurant.delivery_time}</span>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-xs">{getPriceRangeText(normalizedRestaurant.price_range)}</span>
                </div>
                
                {normalizedRestaurant.distance && (
                  <div className="flex items-center text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs">{normalizedRestaurant.distance} km</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Bottom action section */}
            <div className="mt-auto pt-3 flex justify-between items-center">
              <motion.button 
                className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center bg-orange-500 text-white shadow-sm"
                whileHover={{ scale: 1.05, boxShadow: "0 4px 8px rgba(252, 128, 25, 0.3)" }}
                whileTap={{ scale: 0.97 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                View Menu
              </motion.button>
              
              <motion.button 
                className="p-1.5 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200"
                whileHover={{ scale: 1.05 }}
                animate={{ rotate: expanded ? 180 : 0 }}
                onClick={() => setExpanded(!expanded)}
                aria-label="Toggle details"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Expandable details section with enhanced design */}
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 100, damping: 20 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-gray-100/30 bg-gradient-to-b from-white/5 to-white/20 backdrop-blur-sm">
              {/* Popular items section */}
              {normalizedRestaurant.popular_items && normalizedRestaurant.popular_items.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-2 flex items-center text-orange-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Popular Items
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {normalizedRestaurant.popular_items.map((item, idx) => (
                      <motion.span 
                        key={idx}
                        className="inline-block px-2.5 py-1 rounded-full text-xs text-gray-700 glass-panel-enhanced border border-orange-100/30 shadow-sm"
                        whileHover={{ scale: 1.05, y: -2 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        {item}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Address section */}
              <div className="mt-2">
                <h4 className="font-semibold text-sm mb-2 flex items-center text-orange-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Address
                </h4>
                <motion.p 
                  className="text-sm text-gray-700 glass-panel-enhanced p-3 rounded-lg shadow-sm border border-white/30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {normalizedRestaurant.address || 'Address information unavailable'}
                </motion.p>
              </div>

              {/* Offers section if available */}
              {normalizedRestaurant.offers && normalizedRestaurant.offers.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-sm mb-2 flex items-center text-orange-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    Offers & Deals
                  </h4>
                  <div className="space-y-2">
                    {normalizedRestaurant.offers.map((offer, idx) => (
                      <motion.div 
                        key={idx}
                        className="flex items-center glass-panel-enhanced p-2 rounded-lg border-l-4 border-amber-500 shadow-sm"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                      >
                        <div className="p-1 rounded-full mr-2 text-orange-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-700">{offer.description || offer}</span>
                      </motion.div>
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
