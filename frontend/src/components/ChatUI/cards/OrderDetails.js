import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Order details card with Swiggy-inspired styling
 * Displays order items, total, status and actions
 */
const OrderDetails = ({ order }) => {
  // Swiggy color constants
  const SWIGGY_ORANGE = "#FC8019";
  const SWIGGY_DARK_GRAY = "#3D4152";
  const SWIGGY_LIGHT_GRAY = "#686B78";
  
  // Enhanced normalization and validation of order data to prevent errors
  const safeOrder = useMemo(() => {
    console.log("[OrderDetails] Received order data:", order);
    
    if (!order) {
      console.error("OrderDetails: Received null/undefined order");
      return {
        order_id: "Unknown",
        status: "Processing",
        timestamp: new Date().toISOString(),
        items: [],
        total_price: 0
      };
    }

    // Handle both direct order object or order data in nested structure
    const orderData = order.data && order.type === 'order_details' ? order.data : order;
    
    // Better debug logging
    console.log("[OrderDetails] Processing order data:", orderData);
    
    // Extract order ID with better fallbacks
    let orderId = orderData.order_id || orderData._id || orderData.id || "Unknown";
    if (typeof orderId === 'object' && orderId !== null) {
      // Handle case where order_id might be an object
      orderId = orderId.toString() || "Unknown";
    }
    
    // Get food items from any possible array property names
    let foodItems = [];
    
    // Check for all possible item array locations with better logging
    if (Array.isArray(orderData.items) && orderData.items.length > 0) {
      console.log("[OrderDetails] Found items array with length:", orderData.items.length);
      foodItems = [...orderData.items];
    } 
    else if (Array.isArray(orderData.foods) && orderData.foods.length > 0) {
      console.log("[OrderDetails] Using foods array with length:", orderData.foods.length);
      foodItems = [...orderData.foods];
    }
    else if (Array.isArray(orderData.ordered_items) && orderData.ordered_items.length > 0) {
      console.log("[OrderDetails] Using ordered_items array with length:", orderData.ordered_items.length);
      foodItems = [...orderData.ordered_items];
    }
    // Handle nested items inside "order" property
    else if (orderData.order && Array.isArray(orderData.order.items) && orderData.order.items.length > 0) {
      console.log("[OrderDetails] Using nested order.items array");
      foodItems = [...orderData.order.items];
    }
    // Single item cases (objects that aren't in arrays)
    else if (orderData.items && !Array.isArray(orderData.items)) {
      console.log("[OrderDetails] Single item object found in items");
      foodItems = [orderData.items];
    }
    else if (orderData.foods && !Array.isArray(orderData.foods)) {
      console.log("[OrderDetails] Single item object found in foods");
      foodItems = [orderData.foods];
    }
    // Empty array as fallback
    else {
      console.warn("[OrderDetails] No items found in order data");
      foodItems = [];
    }
    
    // Format each food item to ensure consistent keys
    const formattedItems = foodItems.map(item => {
      // Handle case where item might be a string or primitive
      if (typeof item !== 'object' || item === null) {
        return {
          id: "",
          name: item?.toString() || "Unknown Item",
          price: 0,
          quantity: 1,
          total_price: 0
        };
      }
      
      // Extract price with better handling of different formats
      let price = 0;
      if (typeof item.price === 'number') {
        price = item.price;
      } else if (item.price && !isNaN(parseFloat(item.price))) {
        price = parseFloat(item.price);
      } else if (item.cost && !isNaN(parseFloat(item.cost))) {
        price = parseFloat(item.cost);
      }
      
      // Extract quantity with better handling
      let quantity = 1;
      if (typeof item.quantity === 'number') {
        quantity = item.quantity;
      } else if (item.quantity && !isNaN(parseInt(item.quantity))) {
        quantity = parseInt(item.quantity);
      } else if (item.count && !isNaN(parseInt(item.count))) {
        quantity = parseInt(item.count);
      }
      
      // Calculate item total price
      let itemTotalPrice = 0;
      if (typeof item.total_price === 'number') {
        itemTotalPrice = item.total_price;
      } else if (item.total_price && !isNaN(parseFloat(item.total_price))) {
        itemTotalPrice = parseFloat(item.total_price);
      } else {
        itemTotalPrice = price * quantity;
      }
      
      return {
        id: item.id || item._id || "",
        name: item.name || item.item_name || "Unknown Item",
        price: price,
        quantity: quantity,
        total_price: itemTotalPrice
      };
    });

    // Handle total price calculation with much better fallbacks
    let calculatedTotalPrice = 0;
    
    // First check if we have a direct total_price
    if (typeof orderData.total_price === 'number') {
      calculatedTotalPrice = orderData.total_price;
    } 
    else if (orderData.total_price && !isNaN(parseFloat(orderData.total_price))) {
      calculatedTotalPrice = parseFloat(orderData.total_price);
    }
    // Check for total in different property names
    else if (typeof orderData.total === 'number') {
      calculatedTotalPrice = orderData.total;
    }
    else if (orderData.total && !isNaN(parseFloat(orderData.total))) {
      calculatedTotalPrice = parseFloat(orderData.total);
    }
    else if (typeof orderData.amount === 'number') {
      calculatedTotalPrice = orderData.amount;
    }
    else if (orderData.amount && !isNaN(parseFloat(orderData.amount))) {
      calculatedTotalPrice = parseFloat(orderData.amount);
    }
    // Check for nested order.total_price
    else if (orderData.order && typeof orderData.order.total_price === 'number') {
      calculatedTotalPrice = orderData.order.total_price;
    }
    else if (orderData.order && orderData.order.total_price && !isNaN(parseFloat(orderData.order.total_price))) {
      calculatedTotalPrice = parseFloat(orderData.order.total_price);
    }
    // If we still don't have a total, sum up the items
    else {
      calculatedTotalPrice = formattedItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
    }
    
    // Debug the calculated total
    console.log("[OrderDetails] Calculated total price:", calculatedTotalPrice);

    // Deep copy to avoid mutation issues
    const normalizedOrder = {
      order_id: orderId,
      status: orderData.status || orderData.order_status || "Processing",
      timestamp: orderData.timestamp || orderData.created_at || orderData.date || new Date().toISOString(),
      restaurant_name: orderData.restaurant_name || orderData.restaurant || "Restaurant",
      items: formattedItems,
      total_price: calculatedTotalPrice
    };
    
    // Log what we've normalized for debugging
    console.log("OrderDetails: Normalized order data:", normalizedOrder);
    
    return normalizedOrder;
  }, [order]);

  // Get appropriate status label and styling
  const getStatusInfo = (status) => {
    const statusMap = {
      'delivered': { 
        label: 'Delivered',
        color: '#48C479',
        bgColor: '#E5F8EC'
      },
      'processing': { 
        label: 'Processing',
        color: '#DB7C38',
        bgColor: '#F8F1E9'
      },
      'preparing': {
        label: 'Preparing',
        color: '#DB7C38',
        bgColor: '#F8F1E9'
      },
      'in transit': {
        label: 'In Transit',
        color: '#5D8ED5',
        bgColor: '#EDF1F7'
      },
      'cancelled': {
        label: 'Cancelled', 
        color: '#D63B2D',
        bgColor: '#F7E9EB' 
      }
    };
    
    // Normalize status string
    const normalizedStatus = (status || '').toLowerCase().trim();
    
    // Return appropriate styling or default
    return statusMap[normalizedStatus] || { 
      label: status || 'Processing',
      color: '#5D8ED5',
      bgColor: '#EDF1F7'
    };
  };
  
  const statusInfo = getStatusInfo(safeOrder.status);
  
  // Calculate total items
  const totalItems = safeOrder.items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm mb-4">
      {/* Order header */}
      <div className="border-b border-gray-100 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-gray-800">
              Order #{safeOrder.order_id}
            </h3>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(safeOrder.timestamp).toLocaleString()}
            </div>
          </div>
          
          <div 
            className="px-3 py-1 text-sm font-medium rounded-md"
            style={{
              backgroundColor: statusInfo.bgColor,
              color: statusInfo.color
            }}
          >
            {statusInfo.label}
          </div>
        </div>
        
        {/* Restaurant name if available */}
        {safeOrder.restaurant_name && (
          <div className="mt-2 text-sm flex items-center text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {safeOrder.restaurant_name}
          </div>
        )}
      </div>
      
      {/* Order items */}
      <div className="px-4 py-2">
        <div className="text-sm font-medium text-gray-700 mb-2">Order Items</div>
        
        {safeOrder.items && safeOrder.items.length > 0 ? (
          <div>
            {/* Table header */}
            <div className="flex text-xs text-gray-500 pb-2 border-b border-gray-100">
              <div className="flex-grow">Item</div>
              <div className="w-24 text-right">Unit Price</div>
              <div className="w-24 text-right">Amount</div>
            </div>
            
            {/* Order items with improved layout */}
            {safeOrder.items.map((item, idx) => (
              <div 
                key={idx}
                className="py-3 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-start justify-between">
                  {/* Item details with quantity */}
                  <div className="flex items-start flex-grow pr-2">
                    {/* Quantity badge with improved styling */}
                    <div 
                      className="min-w-7 h-7 rounded-full flex items-center justify-center mr-3 text-xs font-medium mt-0.5"
                      style={{ backgroundColor: '#F1F1F6' }}
                    >
                      {item.quantity || 1}
                    </div>
                    <div className="flex-grow">
                      <div className="font-medium text-sm">
                        {item.name} 
                        {item.quantity > 1 && (
                          <span className="font-medium text-xs text-gray-500 ml-1">
                            × {item.quantity}
                          </span>
                        )}
                      </div>
                      {item.variant && (
                        <div className="text-xs text-gray-500">{item.variant}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Price columns */}
                  <div className="flex items-start">
                    <div className="w-24 text-right text-sm font-medium text-gray-600">
                      ₹{typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}
                    </div>
                    <div className="w-24 text-right text-sm font-medium">
                      ₹{typeof item.total_price === 'number' ? item.total_price.toFixed(2) : (item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
                
                {/* Show calculation for items with quantity > 1 */}
                {item.quantity > 1 && (
                  <div className="text-xs text-gray-500 mt-1 ml-10">
                    ₹{typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'} × {item.quantity} = 
                    ₹{typeof item.total_price === 'number' ? item.total_price.toFixed(2) : (item.price * item.quantity).toFixed(2)}
                  </div>
                )}
              </div>
            ))}
            
            {/* Order total */}
            <div className="flex justify-between items-center py-3 font-bold border-t border-gray-200 mt-2">
              <div>Total ({totalItems} {totalItems === 1 ? 'item' : 'items'})</div>
              <div style={{ color: SWIGGY_ORANGE }}>
                ₹{typeof safeOrder.total_price === 'number' ? safeOrder.total_price.toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>No items available for this order</p>
            <p className="text-xs mt-2">Please contact support if this is unexpected</p>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="bg-gray-50 px-4 py-3 flex gap-2">
        <motion.button 
          className="flex-1 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center"
          style={{ backgroundColor: SWIGGY_ORANGE }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Track Order
        </motion.button>
        
        <motion.button 
          className="flex-1 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center"
          whileHover={{ scale: 1.02, backgroundColor: "#f8f8f8" }}
          whileTap={{ scale: 0.98 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Help
        </motion.button>
      </div>
    </div>
  );
};

export default OrderDetails;
