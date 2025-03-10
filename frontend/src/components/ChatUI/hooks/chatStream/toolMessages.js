/**
 * Utility functions for generating user-friendly tool messages
 */

/**
 * Generate user-friendly completion messages for tools
 * @param {string} toolName - The technical name of the tool
 * @param {Object} input - The tool's input parameters
 * @param {Object} output - The tool's output data
 * @returns {string} A user-friendly completion message
 */
export const getToolCompletionMessage = (toolName, input, output) => {
  if (!toolName) return null;
  
  // Default completion patterns
  const completionMessages = {
    'search_restaurants': (input, output) => {
      const query = input?.query || 'restaurants';
      if (output?.results && output.results.length) {
        return `Found ${output.results.length} restaurants matching "${query}"`;
      } else {
        return `Completed search for "${query}"`;
      }
    },
    'search_food_items': (input, output) => {
      const query = input?.query || 'food items';
      if (output?.results && output.results.length) {
        return `Found ${output.results.length} menu items matching "${query}"`;
      } else {
        return `Completed search for "${query}"`;
      }
    },
    'get_restaurant_menu': () => "Received restaurant menu",
    'get_order_details': (input) => {
      const orderId = input?.order_id || 'your order';
      return `Retrieved details for ${orderId}`;
    },
    'initiate_refund': () => "Refund request processed"
  };
  
  try {
    // Try to get a customized completion message
    if (completionMessages[toolName]) {
      return completionMessages[toolName](input, output);
    }
    
    // Generic but formatted completion message
    const readableName = formatToolName(toolName);      
    return `${readableName} completed!`;
  } catch (e) {
    console.error("Error generating completion message:", e);
    return `Tool ${toolName} completed!`;
  }
};

/**
 * Generate user-friendly descriptions for tools based on their name and input
 * @param {string} toolName - The technical name of the tool
 * @param {Object} input - The tool's input parameters
 * @returns {string} A user-friendly description of what the tool is doing
 */
export const getFriendlyToolDescription = (toolName, input) => {
  if (!toolName) return null;
  
  // Default description patterns
  const toolDescriptions = {
    'search_restaurants': (input) => {
      const query = input?.query || 'restaurants';
      return `Searching for ${query} nearby...`;
    },
    'search_food_items': (input) => {
      const query = input?.query || 'food items';
      return `Finding "${query}" on the menu...`;
    },
    'get_restaurant_menu': (input) => {
      const restaurantId = input?.restaurant_id || 'this restaurant';
      return `Looking up menu for restaurant...`;
    },
    'get_order_details': (input) => {
      const orderId = input?.order_id || 'your order';
      return `Retrieving details for ${orderId}...`;
    },
    'initiate_refund': (input) => {
      const orderId = input?.order_id || 'your order';
      return `Processing refund request for ${orderId}...`;
    },
    'unknown_tool': () => 'Processing your request...'
  };

  try {
    // Try to get a customized description based on tool name and input
    if (toolDescriptions[toolName]) {
      return toolDescriptions[toolName](input);
    }
    
    // Fallback to generic but better formatted description
    const readableName = formatToolName(toolName);
      
    if (input?.query) {
      return `${readableName} for "${input.query}"...`;
    }
    
    return `${readableName}...`;
  } catch (e) {
    console.error("Error generating tool description:", e);
    return `Using ${toolName}...`;
  }
};

/**
 * Format a technical tool name into a human-readable string
 * @param {string} toolName - The technical name of the tool
 * @returns {string} A formatted, human-readable tool name
 */
export const formatToolName = (toolName) => {
  return toolName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase());
};
