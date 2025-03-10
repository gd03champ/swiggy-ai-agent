/**
 * Utilities for processing structured data from the chat stream
 */

/**
 * Processes structured data items from the API to ensure they have the correct format
 * @param {Array} structuredDataItems - Raw structured data items received from API
 * @returns {Array} Properly formatted structured data items
 */
export const processStructuredData = (structuredDataItems) => {
  if (!structuredDataItems || !Array.isArray(structuredDataItems)) {
    return [];
  }

  return structuredDataItems.map(item => {
    // Ensure the item has type and data properties
    if (item && item.type && item.data) {
      return item;
    } else if (item && !item.type && item.data) {
      // If we have data but no type, try to infer type
      if (item.data.name && (item.data.price || item.data.menu)) {
        return { type: 'food_item', data: item.data };
      }
      if (item.data.name && item.data.rating) {
        return { type: 'restaurant', data: item.data };
      }
    }
    return item; // Return as-is if we can't process
  });
};

/**
 * Attempts to detect and format structured data from different formats
 * @param {Object} data - The data object to analyze
 * @returns {Object|null} A properly formatted structured item or null if not detectable
 */
export const detectStructuredData = (data) => {
  if (!data) return null;
  
  try {
    // Case 1: Data is already properly formatted with type/data
    if (data.type && data.data) {
      console.log("[DEBUG CRITICAL] Well-formed structured data with type:", data.type);
      return data;
    }
    
    // Case 2: Restaurant data detection
    if (data.name && (data.cuisine || data.rating)) {
      return {
        type: 'restaurant',
        data: data
      };
    }
    
    // Case 3: Food item data detection
    if (data.name && (data.price || data.description)) {
      return {
        type: 'food_item',
        data: data
      };
    }
    
    // Case 4: Try to extract from nested structure
    if (typeof data === 'object') {
      // Look for nested restaurant or food item data
      if (data.restaurant) {
        return {
          type: 'restaurant',
          data: data.restaurant
        };
      } else if (data.food_item) {
        return {
          type: 'food_item',
          data: data.food_item
        };
      } else {
        // Last resort: try to guess from properties
        if (Object.prototype.hasOwnProperty.call(data, 'rating') || 
            Object.prototype.hasOwnProperty.call(data, 'cuisine')) {
          return {
            type: 'restaurant',
            data: data
          };
        } 
        // Look for food item-like properties
        else if (Object.prototype.hasOwnProperty.call(data, 'price')) {
          return {
            type: 'food_item',
            data: data
          };
        }
      }
    }
    
    // Just use as is if we can't infer
    return data;
  } catch (e) {
    console.error("[DEBUG ERROR] Error processing structured data:", e);
    return null;
  }
};
